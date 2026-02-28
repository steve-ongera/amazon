from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly, AllowAny
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.db.models import Q, Avg, Count
from django_filters.rest_framework import DjangoFilterBackend
from django.conf import settings
from decimal import Decimal
from datetime import datetime, timedelta
import requests
import base64
import logging

from .models import (
    Country, County, PickupStation,
    Category, Brand, Product, ProductVariant, Review,
    Banner, Cart, CartItem, Address, Order, OrderItem,
    RecentlyViewed, UserProfile, Wishlist, Coupon,
    MpesaTransaction, PayPalTransaction, ExchangeRate
)
from .serializers import (
    CountrySerializer, CountySerializer, CountyListSerializer, PickupStationSerializer,
    CategorySerializer, BrandSerializer,
    ProductListSerializer, ProductDetailSerializer,
    ProductVariantSerializer, ReviewSerializer,
    BannerSerializer, CartSerializer, CartItemSerializer,
    AddressSerializer, OrderSerializer, OrderCreateSerializer,
    UserSerializer, RegisterSerializer,
    RecentlyViewedSerializer, WishlistSerializer,
    MpesaSTKSerializer, PayPalCreateOrderSerializer, PayPalCaptureSerializer,
    CouponSerializer, ExchangeRateSerializer,
)

logger = logging.getLogger('store')


# ─── Geography ────────────────────────────────────────────────────────────────

class CountryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Country.objects.filter(is_active=True)
    serializer_class = CountrySerializer
    lookup_field = 'code'


class CountyViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = County.objects.filter(is_active=True).select_related('country').prefetch_related('pickup_stations')
    serializer_class = CountySerializer
    lookup_field = 'slug'
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['country__code']

    def get_serializer_class(self):
        if self.action == 'list':
            return CountyListSerializer
        return CountySerializer


class PickupStationViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = PickupStation.objects.filter(is_active=True).select_related('county__country')
    serializer_class = PickupStationSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['county__slug', 'county__country__code']


# ─── Category ─────────────────────────────────────────────────────────────────

class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Category.objects.filter(is_active=True, parent=None).prefetch_related(
        'subcategories'
    )
    serializer_class = CategorySerializer
    lookup_field = 'slug'

    @action(detail=False, methods=['get'])
    def all_flat(self, request):
        cats = Category.objects.filter(is_active=True)
        return Response(CategorySerializer(cats, many=True, context={'request': request}).data)

    @action(detail=False, methods=['get'])
    def featured(self, request):
        cats = Category.objects.filter(is_active=True, is_featured=True, parent=None)
        return Response(CategorySerializer(cats, many=True, context={'request': request}).data)

    @action(detail=True, methods=['get'])
    def subcategories(self, request, slug=None):
        cat = self.get_object()
        subs = cat.subcategories.filter(is_active=True)
        return Response(CategorySerializer(subs, many=True, context={'request': request}).data)


# ─── Brand ────────────────────────────────────────────────────────────────────

class BrandViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Brand.objects.filter(is_active=True)
    serializer_class = BrandSerializer
    lookup_field = 'slug'

    @action(detail=False, methods=['get'])
    def featured(self, request):
        brands = self.queryset.filter(is_featured=True)
        return Response(BrandSerializer(brands, many=True, context={'request': request}).data)


# ─── Product ──────────────────────────────────────────────────────────────────

class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Product.objects.filter(is_active=True).select_related(
        'brand', 'category'
    ).prefetch_related('images', 'variants', 'reviews')
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['brand__slug', 'category__slug', 'is_featured',
                        'is_best_seller', 'is_new_arrival', 'is_prime', 'condition']
    search_fields = ['name', 'description', 'brand__name', 'tags', 'asin', 'sku']
    ordering_fields = ['created_at', 'price_usd', 'price_kes', 'average_rating']
    ordering = ['-created_at']
    lookup_field = 'slug'

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ProductDetailSerializer
        return ProductListSerializer

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        # Track recently viewed
        if request.user.is_authenticated:
            RecentlyViewed.objects.update_or_create(
                user=request.user, product=instance,
                defaults={}
            )
        elif request.session.session_key:
            RecentlyViewed.objects.update_or_create(
                session_key=request.session.session_key, product=instance,
                defaults={}
            )
        return Response(ProductDetailSerializer(instance, context={'request': request}).data)

    @action(detail=True, methods=['get'])
    def related(self, request, slug=None):
        product = self.get_object()
        related = Product.objects.filter(
            is_active=True, category=product.category
        ).exclude(id=product.id).prefetch_related('images', 'variants')[:8]
        return Response(ProductListSerializer(related, many=True, context={'request': request}).data)

    @action(detail=False, methods=['get'])
    def featured(self, request):
        products = self.queryset.filter(is_featured=True)[:12]
        return Response(ProductListSerializer(products, many=True, context={'request': request}).data)

    @action(detail=False, methods=['get'])
    def best_sellers(self, request):
        products = self.queryset.filter(is_best_seller=True)[:20]
        return Response(ProductListSerializer(products, many=True, context={'request': request}).data)

    @action(detail=False, methods=['get'])
    def new_arrivals(self, request):
        products = self.queryset.filter(is_new_arrival=True).order_by('-created_at')[:20]
        return Response(ProductListSerializer(products, many=True, context={'request': request}).data)

    @action(detail=False, methods=['get'])
    def amazon_choice(self, request):
        products = self.queryset.filter(is_amazon_choice=True)[:12]
        return Response(ProductListSerializer(products, many=True, context={'request': request}).data)

    @action(detail=False, methods=['get'])
    def by_category(self, request):
        slug = request.query_params.get('slug')
        if not slug:
            return Response({'error': 'slug param required'}, status=400)
        try:
            cat = Category.objects.get(slug=slug)
            subcats = cat.subcategories.all()
            products = self.queryset.filter(
                Q(category=cat) | Q(category__in=subcats)
            )
            # Apply filters
            min_price = request.query_params.get('min_price')
            max_price = request.query_params.get('max_price')
            brand_slugs = request.query_params.getlist('brand')
            currency = request.query_params.get('currency', 'USD')
            if min_price:
                field = 'price_kes' if currency == 'KES' else 'price_usd'
                products = products.filter(**{f'{field}__gte': min_price})
            if max_price:
                field = 'price_kes' if currency == 'KES' else 'price_usd'
                products = products.filter(**{f'{field}__lte': max_price})
            if brand_slugs:
                products = products.filter(brand__slug__in=brand_slugs)
            # Ordering
            sort = request.query_params.get('sort', '-created_at')
            valid_sorts = ['price_usd', '-price_usd', 'price_kes', '-price_kes',
                           'created_at', '-created_at', '-average_rating']
            if sort in valid_sorts:
                products = products.order_by(sort)
            page = self.paginate_queryset(products)
            if page is not None:
                return self.get_paginated_response(
                    ProductListSerializer(page, many=True, context={'request': request}).data
                )
            return Response(ProductListSerializer(products, many=True, context={'request': request}).data)
        except Category.DoesNotExist:
            return Response({'error': 'Category not found'}, status=404)

    @action(detail=False, methods=['get'])
    def search(self, request):
        query = request.query_params.get('q', '')
        if not query:
            return Response({'error': 'q param required'}, status=400)
        products = self.queryset.filter(
            Q(name__icontains=query) |
            Q(description__icontains=query) |
            Q(brand__name__icontains=query) |
            Q(tags__icontains=query) |
            Q(asin__icontains=query)
        )
        page = self.paginate_queryset(products)
        if page is not None:
            return self.get_paginated_response(
                ProductListSerializer(page, many=True, context={'request': request}).data
            )
        return Response(ProductListSerializer(products, many=True, context={'request': request}).data)

    @action(detail=True, methods=['get', 'post'], permission_classes=[IsAuthenticatedOrReadOnly])
    def reviews(self, request, slug=None):
        product = self.get_object()
        if request.method == 'GET':
            reviews = product.reviews.filter(is_approved=True)
            return Response(ReviewSerializer(reviews, many=True, context={'request': request}).data)
        if Review.objects.filter(product=product, user=request.user).exists():
            return Response({'error': 'You have already reviewed this product.'}, status=400)
        serializer = ReviewSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save(product=product)
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)


# ─── Banner ───────────────────────────────────────────────────────────────────

class BannerViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Banner.objects.filter(is_active=True)
    serializer_class = BannerSerializer

    @action(detail=False, methods=['get'])
    def hero(self, request):
        return Response(BannerSerializer(
            self.queryset.filter(position='hero'), many=True, context={'request': request}
        ).data)

    @action(detail=False, methods=['get'])
    def promo(self, request):
        return Response(BannerSerializer(
            self.queryset.filter(position='promo_strip'), many=True, context={'request': request}
        ).data)


# ─── Cart ─────────────────────────────────────────────────────────────────────

class CartViewSet(viewsets.ViewSet):
    def _get_cart(self, request):
        if request.user.is_authenticated:
            cart, _ = Cart.objects.get_or_create(user=request.user)
        else:
            if not request.session.session_key:
                request.session.create()
            cart, _ = Cart.objects.get_or_create(session_key=request.session.session_key)
        return cart

    def list(self, request):
        cart = self._get_cart(request)
        return Response(CartSerializer(cart, context={'request': request}).data)

    def create(self, request):
        """Add item to cart."""
        cart = self._get_cart(request)
        serializer = CartItemSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save(cart=cart)
            return Response(CartSerializer(cart, context={'request': request}).data, status=201)
        return Response(serializer.errors, status=400)

    def destroy(self, request, pk=None):
        cart = self._get_cart(request)
        try:
            CartItem.objects.get(id=pk, cart=cart).delete()
            return Response(CartSerializer(cart, context={'request': request}).data)
        except CartItem.DoesNotExist:
            return Response({'error': 'Item not found'}, status=404)

    @action(detail=False, methods=['patch'])
    def update_item(self, request):
        cart = self._get_cart(request)
        item_id = request.data.get('item_id')
        quantity = int(request.data.get('quantity', 1))
        try:
            item = CartItem.objects.get(id=item_id, cart=cart)
            if quantity <= 0:
                item.delete()
            else:
                item.quantity = quantity
                item.save()
            return Response(CartSerializer(cart, context={'request': request}).data)
        except CartItem.DoesNotExist:
            return Response({'error': 'Item not found'}, status=404)

    @action(detail=False, methods=['delete'])
    def clear(self, request):
        cart = self._get_cart(request)
        cart.items.all().delete()
        return Response(CartSerializer(cart, context={'request': request}).data)

    @action(detail=False, methods=['post'])
    def merge(self, request):
        """Merge session cart into user cart on login."""
        if not request.user.is_authenticated:
            return Response({'error': 'Must be logged in'}, status=401)
        session_key = request.data.get('session_key')
        if not session_key:
            return Response({'error': 'session_key required'}, status=400)
        try:
            session_cart = Cart.objects.get(session_key=session_key)
            user_cart, _ = Cart.objects.get_or_create(user=request.user)
            for item in session_cart.items.all():
                existing = CartItem.objects.filter(
                    cart=user_cart, product=item.product, variant=item.variant
                ).first()
                if existing:
                    existing.quantity += item.quantity
                    existing.save()
                else:
                    item.cart = user_cart
                    item.save()
            session_cart.delete()
            return Response(CartSerializer(user_cart, context={'request': request}).data)
        except Cart.DoesNotExist:
            cart, _ = Cart.objects.get_or_create(user=request.user)
            return Response(CartSerializer(cart, context={'request': request}).data)


# ─── Address ──────────────────────────────────────────────────────────────────

class AddressViewSet(viewsets.ModelViewSet):
    serializer_class = AddressSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Address.objects.filter(user=self.request.user).select_related('county', 'country')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


# ─── Order ────────────────────────────────────────────────────────────────────

class OrderViewSet(viewsets.ModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).prefetch_related('items')

    def create(self, request):
        serializer = OrderCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        data = serializer.validated_data

        try:
            cart = Cart.objects.get(user=request.user)
        except Cart.DoesNotExist:
            return Response({'error': 'Your cart is empty.'}, status=400)

        if not cart.items.exists():
            return Response({'error': 'Your cart is empty.'}, status=400)

        currency = data.get('currency', 'USD')

        # Compute shipping fee
        shipping_fee = Decimal('0')
        if data.get('delivery_type') == 'pickup' and data.get('pickup_station_id'):
            try:
                station = PickupStation.objects.get(id=data['pickup_station_id'])
                shipping_fee = station.delivery_fee_kes if currency == 'KES' else station.delivery_fee_usd
            except PickupStation.DoesNotExist:
                pass
        else:
            shipping_fee = Decimal('350') if currency == 'KES' else Decimal('3.00')

        # Compute subtotal
        subtotal = cart.total_kes if currency == 'KES' else cart.total_usd

        # Apply coupon
        discount = Decimal('0')
        coupon_code = data.get('coupon_code', '').upper()
        if coupon_code:
            from django.utils import timezone
            try:
                coupon = Coupon.objects.get(
                    code=coupon_code, is_active=True,
                    valid_from__lte=timezone.now(), valid_until__gte=timezone.now()
                )
                if coupon.discount_type == 'percent':
                    discount = subtotal * coupon.discount_value / 100
                elif coupon.discount_type == 'fixed_usd' and currency == 'USD':
                    discount = coupon.discount_value
                elif coupon.discount_type == 'fixed_kes' and currency == 'KES':
                    discount = coupon.discount_value
                coupon.used_count += 1
                coupon.save()
            except Coupon.DoesNotExist:
                return Response({'error': 'Invalid or expired coupon code.'}, status=400)

        tax = subtotal * Decimal('0.16')  # 16% VAT
        total = subtotal + shipping_fee + tax - discount

        # Create order
        order = Order.objects.create(
            user=request.user,
            full_name=data['full_name'],
            email=data['email'],
            phone=data['phone'],
            payment_method=data['payment_method'],
            currency=currency,
            delivery_type=data.get('delivery_type', 'home'),
            pickup_station_id=data.get('pickup_station_id'),
            shipping_address=data.get('shipping_address', ''),
            shipping_city=data.get('shipping_city', ''),
            shipping_county_id=data.get('shipping_county_id'),
            shipping_country_id=data.get('shipping_country_id'),
            shipping_postal_code=data.get('shipping_postal_code', ''),
            subtotal=subtotal,
            shipping_fee=shipping_fee,
            tax=tax,
            discount=discount,
            total=total,
            mpesa_phone=data.get('mpesa_phone', ''),
            notes=data.get('notes', ''),
        )

        # Create order items
        for cart_item in cart.items.select_related('product', 'variant'):
            price = cart_item.unit_price_kes if currency == 'KES' else cart_item.unit_price_usd
            main_image = cart_item.product.main_image
            image_url = ''
            if main_image and main_image.image:
                try:
                    image_url = request.build_absolute_uri(main_image.image.url)
                except Exception:
                    pass
            OrderItem.objects.create(
                order=order,
                product=cart_item.product,
                variant=cart_item.variant,
                product_name=cart_item.product.name,
                variant_name=cart_item.variant.name if cart_item.variant else '',
                sku=cart_item.variant.sku if cart_item.variant else cart_item.product.sku,
                image_url=image_url,
                price=price,
                quantity=cart_item.quantity,
                currency=currency,
            )

        cart.items.all().delete()
        return Response(OrderSerializer(order, context={'request': request}).data, status=201)


# ─── Coupon ───────────────────────────────────────────────────────────────────

class CouponValidateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        from django.utils import timezone
        code = request.data.get('code', '').upper()
        cart_total = Decimal(str(request.data.get('cart_total', 0)))
        currency = request.data.get('currency', 'USD')
        try:
            coupon = Coupon.objects.get(
                code=code, is_active=True,
                valid_from__lte=timezone.now(), valid_until__gte=timezone.now()
            )
            if coupon.max_uses and coupon.used_count >= coupon.max_uses:
                return Response({'error': 'Coupon has reached its usage limit.'}, status=400)
            if cart_total < coupon.min_order_value:
                return Response({
                    'error': f'Minimum order value for this coupon is {coupon.min_order_value}.'
                }, status=400)
            # Compute discount
            if coupon.discount_type == 'percent':
                discount = cart_total * coupon.discount_value / 100
            elif coupon.discount_type == 'fixed_usd':
                discount = coupon.discount_value
            elif coupon.discount_type == 'fixed_kes':
                discount = coupon.discount_value
            else:
                discount = Decimal('0')
            return Response({
                'valid': True,
                'discount': float(discount),
                'discount_type': coupon.discount_type,
                'discount_value': float(coupon.discount_value),
                'description': coupon.description,
            })
        except Coupon.DoesNotExist:
            return Response({'error': 'Invalid coupon code.'}, status=400)


# ─── M-Pesa ───────────────────────────────────────────────────────────────────

class MpesaSTKPushView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_access_token(self):
        consumer_key = settings.MPESA_CONSUMER_KEY
        consumer_secret = settings.MPESA_CONSUMER_SECRET
        if not consumer_key or not consumer_secret:
            raise ValueError('M-Pesa credentials not configured.')
        auth = base64.b64encode(f"{consumer_key}:{consumer_secret}".encode()).decode()
        try:
            r = requests.get(
                f"{settings.MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials",
                headers={"Authorization": f"Basic {auth}"},
                timeout=30,
            )
            r.raise_for_status()
            if not r.text.strip():
                raise ValueError(f'Empty M-Pesa OAuth response (HTTP {r.status_code}).')
            data = r.json()
            token = data.get('access_token')
            if not token:
                raise ValueError(f'No access_token in response: {data}')
            return token
        except requests.exceptions.RequestException as e:
            raise ValueError(f'M-Pesa OAuth failed: {e}')

    def post(self, request):
        serializer = MpesaSTKSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)
        phone = serializer.validated_data['phone']
        order_id = serializer.validated_data['order_id']
        try:
            order = Order.objects.get(id=order_id, user=request.user)
        except Order.DoesNotExist:
            return Response({'error': 'Order not found.'}, status=404)
        try:
            token = self._get_access_token()
        except ValueError as e:
            return Response({'error': str(e)}, status=502)

        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        password = base64.b64encode(
            f"{settings.MPESA_SHORTCODE}{settings.MPESA_PASSKEY}{timestamp}".encode()
        ).decode()
        # Amount must be in KES integers
        amount = int(order.total) if order.currency == 'KES' else int(order.total * 130)
        payload = {
            "BusinessShortCode": settings.MPESA_SHORTCODE,
            "Password": password,
            "Timestamp": timestamp,
            "TransactionType": "CustomerPayBillOnline",
            "Amount": amount,
            "PartyA": phone,
            "PartyB": settings.MPESA_SHORTCODE,
            "PhoneNumber": phone,
            "CallBackURL": settings.MPESA_CALLBACK_URL,
            "AccountReference": order.order_number,
            "TransactionDesc": f"Payment for {order.order_number}",
        }
        try:
            r = requests.post(
                f"{settings.MPESA_BASE_URL}/mpesa/stkpush/v1/processrequest",
                json=payload,
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                timeout=30,
            )
            data = r.json()
        except Exception as e:
            return Response({'error': f'STK push failed: {e}'}, status=502)

        if data.get('ResponseCode') == '0':
            checkout_id = data['CheckoutRequestID']
            MpesaTransaction.objects.create(
                order=order,
                checkout_request_id=checkout_id,
                merchant_request_id=data.get('MerchantRequestID', ''),
                amount=amount,
                phone=phone,
            )
            order.mpesa_checkout_request_id = checkout_id
            order.mpesa_phone = phone
            order.status = 'payment_pending'
            order.save()
            return Response({
                'message': 'STK push sent. Check your phone.',
                'checkout_request_id': checkout_id,
            })
        return Response({'error': 'Failed to initiate payment', 'details': data}, status=400)


class MpesaCallbackView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        data = request.data
        stk = data.get('Body', {}).get('stkCallback', {})
        checkout_request_id = stk.get('CheckoutRequestID')
        result_code = str(stk.get('ResultCode', ''))
        result_desc = stk.get('ResultDesc', '')
        try:
            tx = MpesaTransaction.objects.get(checkout_request_id=checkout_request_id)
            tx.result_code = result_code
            tx.result_desc = result_desc
            if result_code == '0':
                items = {
                    i['Name']: i.get('Value', '')
                    for i in stk.get('CallbackMetadata', {}).get('Item', [])
                }
                tx.mpesa_receipt = items.get('MpesaReceiptNumber', '')
                tx.status = 'success'
                tx.order.payment_status = 'paid'
                tx.order.status = 'confirmed'
                tx.order.mpesa_transaction_id = tx.mpesa_receipt
                tx.order.save()
            else:
                tx.status = 'failed'
            tx.save()
        except MpesaTransaction.DoesNotExist:
            logger.warning(f'M-Pesa callback for unknown tx: {checkout_request_id}')
        return Response({'ResultCode': 0, 'ResultDesc': 'Accepted'})


class MpesaStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, order_id):
        try:
            order = Order.objects.get(id=order_id, user=request.user)
            return Response({
                'payment_status': order.payment_status,
                'order_status': order.status,
            })
        except Order.DoesNotExist:
            return Response({'error': 'Order not found.'}, status=404)


# ─── PayPal ───────────────────────────────────────────────────────────────────

class PayPalCreateOrderView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_access_token(self):
        client_id = settings.PAYPAL_CLIENT_ID
        client_secret = settings.PAYPAL_CLIENT_SECRET
        auth = base64.b64encode(f"{client_id}:{client_secret}".encode()).decode()
        r = requests.post(
            f"{settings.PAYPAL_BASE_URL}/v1/oauth2/token",
            headers={"Authorization": f"Basic {auth}", "Content-Type": "application/x-www-form-urlencoded"},
            data="grant_type=client_credentials",
            timeout=30,
        )
        return r.json().get('access_token')

    def post(self, request):
        serializer = PayPalCreateOrderSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)
        order_id = serializer.validated_data['order_id']
        try:
            order = Order.objects.get(id=order_id, user=request.user)
        except Order.DoesNotExist:
            return Response({'error': 'Order not found.'}, status=404)

        try:
            token = self._get_access_token()
            amount = str(order.total.quantize(Decimal('0.01')))
            currency = order.currency if order.currency == 'USD' else 'USD'
            payload = {
                "intent": "CAPTURE",
                "purchase_units": [{
                    "reference_id": order.order_number,
                    "amount": {"currency_code": currency, "value": amount},
                    "description": f"Order {order.order_number}",
                }],
                "application_context": {
                    "return_url": f"{settings.FRONTEND_URL}/checkout/success?order={order.id}",
                    "cancel_url": f"{settings.FRONTEND_URL}/checkout/cancel?order={order.id}",
                }
            }
            r = requests.post(
                f"{settings.PAYPAL_BASE_URL}/v2/checkout/orders",
                json=payload,
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                timeout=30,
            )
            data = r.json()
            if r.status_code == 201:
                paypal_order_id = data['id']
                approval_url = next(
                    (link['href'] for link in data.get('links', []) if link['rel'] == 'approve'), None
                )
                PayPalTransaction.objects.create(
                    order=order,
                    paypal_order_id=paypal_order_id,
                    amount=order.total,
                    currency=currency,
                    raw_response=data,
                )
                order.paypal_order_id = paypal_order_id
                order.status = 'payment_pending'
                order.save()
                return Response({'paypal_order_id': paypal_order_id, 'approval_url': approval_url})
            return Response({'error': 'PayPal order creation failed', 'details': data}, status=400)
        except Exception as e:
            return Response({'error': str(e)}, status=502)


class PayPalCaptureView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = PayPalCaptureSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)
        order_id = serializer.validated_data['order_id']
        paypal_order_id = serializer.validated_data['paypal_order_id']
        try:
            order = Order.objects.get(id=order_id, user=request.user)
        except Order.DoesNotExist:
            return Response({'error': 'Order not found.'}, status=404)

        try:
            client_id = settings.PAYPAL_CLIENT_ID
            client_secret = settings.PAYPAL_CLIENT_SECRET
            auth = base64.b64encode(f"{client_id}:{client_secret}".encode()).decode()
            token_r = requests.post(
                f"{settings.PAYPAL_BASE_URL}/v1/oauth2/token",
                headers={"Authorization": f"Basic {auth}", "Content-Type": "application/x-www-form-urlencoded"},
                data="grant_type=client_credentials", timeout=30,
            )
            token = token_r.json().get('access_token')
            r = requests.post(
                f"{settings.PAYPAL_BASE_URL}/v2/checkout/orders/{paypal_order_id}/capture",
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                timeout=30,
            )
            data = r.json()
            if data.get('status') == 'COMPLETED':
                capture_id = data['purchase_units'][0]['payments']['captures'][0]['id']
                try:
                    tx = PayPalTransaction.objects.get(paypal_order_id=paypal_order_id)
                    tx.capture_id = capture_id
                    tx.status = 'completed'
                    tx.raw_response = data
                    tx.save()
                except PayPalTransaction.DoesNotExist:
                    pass
                order.payment_status = 'paid'
                order.status = 'confirmed'
                order.paypal_capture_id = capture_id
                order.save()
                return Response({'status': 'success', 'capture_id': capture_id})
            return Response({'error': 'Payment capture failed', 'details': data}, status=400)
        except Exception as e:
            return Response({'error': str(e)}, status=502)


# ─── Auth ─────────────────────────────────────────────────────────────────────

class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            refresh = RefreshToken.for_user(user)
            return Response({
                'user': UserSerializer(user, context={'request': request}).data,
                'tokens': {'access': str(refresh.access_token), 'refresh': str(refresh)},
            }, status=201)
        return Response(serializer.errors, status=400)


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email', '')
        password = request.data.get('password', '')
        try:
            user_obj = User.objects.get(email=email)
            username = user_obj.username
        except User.DoesNotExist:
            username = email
        user = authenticate(username=username, password=password)
        if user and user.is_active:
            refresh = RefreshToken.for_user(user)
            return Response({
                'user': UserSerializer(user, context={'request': request}).data,
                'tokens': {'access': str(refresh.access_token), 'refresh': str(refresh)},
            })
        return Response({'error': 'Invalid email or password.'}, status=401)


class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user, context={'request': request}).data)

    def patch(self, request):
        user = request.user
        for field in ['first_name', 'last_name', 'email']:
            if field in request.data:
                setattr(user, field, request.data[field])
        user.save()
        profile, _ = UserProfile.objects.get_or_create(user=user)
        for field in ['phone', 'preferred_currency', 'newsletter_subscribed']:
            if field in request.data:
                setattr(profile, field, request.data[field])
        profile.save()
        return Response(UserSerializer(user, context={'request': request}).data)


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        old_password = request.data.get('old_password')
        new_password = request.data.get('new_password')
        if not request.user.check_password(old_password):
            return Response({'error': 'Old password is incorrect.'}, status=400)
        if len(new_password) < 8:
            return Response({'error': 'New password must be at least 8 characters.'}, status=400)
        request.user.set_password(new_password)
        request.user.save()
        return Response({'message': 'Password changed successfully.'})


# ─── Wishlist ─────────────────────────────────────────────────────────────────

class WishlistViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        items = Wishlist.objects.filter(user=request.user).select_related('product')
        return Response(WishlistSerializer(items, many=True, context={'request': request}).data)

    def create(self, request):
        product_id = request.data.get('product_id')
        try:
            product = Product.objects.get(id=product_id)
            item, created = Wishlist.objects.get_or_create(user=request.user, product=product)
            return Response(WishlistSerializer(item, context={'request': request}).data,
                            status=201 if created else 200)
        except Product.DoesNotExist:
            return Response({'error': 'Product not found.'}, status=404)

    def destroy(self, request, pk=None):
        try:
            Wishlist.objects.get(id=pk, user=request.user).delete()
            return Response(status=204)
        except Wishlist.DoesNotExist:
            return Response({'error': 'Not found.'}, status=404)


# ─── Recently Viewed ──────────────────────────────────────────────────────────

class RecentlyViewedView(APIView):
    def get(self, request):
        if request.user.is_authenticated:
            items = RecentlyViewed.objects.filter(user=request.user)[:10]
        elif request.session.session_key:
            items = RecentlyViewed.objects.filter(session_key=request.session.session_key)[:10]
        else:
            items = []
        return Response(RecentlyViewedSerializer(items, many=True, context={'request': request}).data)


# ─── Exchange Rate ────────────────────────────────────────────────────────────

class ExchangeRateView(APIView):
    def get(self, request):
        rates = ExchangeRate.objects.all()
        return Response(ExchangeRateSerializer(rates, many=True).data)


# ─── Homepage Aggregated Data ─────────────────────────────────────────────────

class HomepageView(APIView):
    def get(self, request):
        ctx = {'request': request}
        return Response({
            'banners': BannerSerializer(
                Banner.objects.filter(is_active=True, position='hero').order_by('order'),
                many=True, context=ctx
            ).data,
            'promo_banners': BannerSerializer(
                Banner.objects.filter(is_active=True, position='promo_strip'),
                many=True, context=ctx
            ).data,
            'featured_categories': CategorySerializer(
                Category.objects.filter(is_active=True, is_featured=True, parent=None).prefetch_related('subcategories')[:10],
                many=True, context=ctx
            ).data,
            'best_sellers': ProductListSerializer(
                Product.objects.filter(is_active=True, is_best_seller=True).prefetch_related('images')[:20],
                many=True, context=ctx
            ).data,
            'new_arrivals': ProductListSerializer(
                Product.objects.filter(is_active=True, is_new_arrival=True).order_by('-created_at').prefetch_related('images')[:20],
                many=True, context=ctx
            ).data,
            'featured_products': ProductListSerializer(
                Product.objects.filter(is_active=True, is_featured=True).prefetch_related('images')[:12],
                many=True, context=ctx
            ).data,
            'amazon_choice': ProductListSerializer(
                Product.objects.filter(is_active=True, is_amazon_choice=True).prefetch_related('images')[:8],
                many=True, context=ctx
            ).data,
        })