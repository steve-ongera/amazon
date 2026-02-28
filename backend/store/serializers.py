from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (
    Country, County, PickupStation,
    Category, Brand, Product, ProductVariant, ProductImage,
    ProductSpecification, Review, Banner,
    Cart, CartItem, Address, Order, OrderItem,
    UserProfile, Wishlist, RecentlyViewed, Coupon,
    MpesaTransaction, PayPalTransaction, ExchangeRate
)


# ─── Geography ────────────────────────────────────────────────────────────────

class CountrySerializer(serializers.ModelSerializer):
    class Meta:
        model = Country
        fields = ['id', 'name', 'code', 'currency_code', 'currency_symbol', 'flag_emoji']


class PickupStationSerializer(serializers.ModelSerializer):
    class Meta:
        model = PickupStation
        fields = ['id', 'name', 'slug', 'address', 'phone', 'operating_hours',
                  'delivery_fee_usd', 'delivery_fee_kes', 'latitude', 'longitude']


class CountySerializer(serializers.ModelSerializer):
    country = CountrySerializer(read_only=True)
    pickup_stations = PickupStationSerializer(many=True, read_only=True)

    class Meta:
        model = County
        fields = ['id', 'name', 'slug', 'country', 'pickup_stations']


class CountyListSerializer(serializers.ModelSerializer):
    country_name = serializers.CharField(source='country.name', read_only=True)

    class Meta:
        model = County
        fields = ['id', 'name', 'slug', 'country_name']


# ─── Category ─────────────────────────────────────────────────────────────────

class SubCategorySerializer(serializers.ModelSerializer):
    product_count = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'icon', 'image', 'product_count']

    def get_product_count(self, obj):
        return obj.products.filter(is_active=True).count()


class CategorySerializer(serializers.ModelSerializer):
    subcategories = SubCategorySerializer(many=True, read_only=True)
    product_count = serializers.SerializerMethodField()
    breadcrumb = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'description', 'icon', 'image', 'banner_image',
                  'parent', 'subcategories', 'is_active', 'is_featured', 'order',
                  'product_count', 'breadcrumb', 'meta_title', 'meta_description']

    def get_product_count(self, obj):
        return obj.products.filter(is_active=True).count()

    def get_breadcrumb(self, obj):
        crumbs = []
        current = obj
        while current:
            crumbs.insert(0, {'name': current.name, 'slug': current.slug})
            current = current.parent
        return crumbs


# ─── Brand ────────────────────────────────────────────────────────────────────

class BrandSerializer(serializers.ModelSerializer):
    product_count = serializers.SerializerMethodField()

    class Meta:
        model = Brand
        fields = ['id', 'name', 'slug', 'logo', 'description', 'website', 'is_featured', 'product_count']

    def get_product_count(self, obj):
        return obj.products.filter(is_active=True).count()


# ─── Product ──────────────────────────────────────────────────────────────────

class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ['id', 'image', 'alt_text', 'is_primary', 'order']


class ProductVariantSerializer(serializers.ModelSerializer):
    effective_price_usd = serializers.ReadOnlyField()
    effective_price_kes = serializers.ReadOnlyField()

    class Meta:
        model = ProductVariant
        fields = ['id', 'name', 'sku', 'color', 'color_hex', 'size',
                  'storage', 'ram', 'style',
                  'price_usd', 'sale_price_usd', 'effective_price_usd',
                  'price_kes', 'sale_price_kes', 'effective_price_kes',
                  'stock', 'image', 'is_active']


class ProductSpecificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductSpecification
        fields = ['group', 'key', 'value', 'order']


class ReviewSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    user_avatar = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = ['id', 'user_name', 'user_avatar', 'rating', 'title', 'comment',
                  'pros', 'cons', 'is_verified_purchase', 'helpful_votes',
                  'images', 'created_at']
        read_only_fields = ['user', 'is_verified_purchase', 'helpful_votes', 'created_at']

    def get_user_name(self, obj):
        name = f"{obj.user.first_name} {obj.user.last_name}".strip()
        if name:
            # Mask for privacy: "John D."
            parts = name.split()
            return f"{parts[0]} {parts[-1][0]}." if len(parts) > 1 else parts[0]
        return obj.user.username

    def get_user_avatar(self, obj):
        try:
            if obj.user.profile.avatar:
                request = self.context.get('request')
                if request:
                    return request.build_absolute_uri(obj.user.profile.avatar.url)
        except Exception:
            pass
        return None

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class ProductListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing/search."""
    brand_name = serializers.CharField(source='brand.name', read_only=True)
    brand_slug = serializers.CharField(source='brand.slug', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    category_slug = serializers.CharField(source='category.slug', read_only=True)
    main_image = ProductImageSerializer(read_only=True)
    effective_price_usd = serializers.ReadOnlyField()
    effective_price_kes = serializers.ReadOnlyField()
    discount_percent = serializers.ReadOnlyField()
    average_rating = serializers.ReadOnlyField()
    review_count = serializers.ReadOnlyField()
    in_stock = serializers.ReadOnlyField()

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'slug', 'asin',
            'brand_name', 'brand_slug', 'category_name', 'category_slug',
            'main_image', 'short_description',
            'price_usd', 'sale_price_usd', 'effective_price_usd',
            'price_kes', 'sale_price_kes', 'effective_price_kes',
            'discount_percent',
            'is_featured', 'is_best_seller', 'is_new_arrival',
            'is_amazon_choice', 'is_prime',
            'has_coupon', 'coupon_text',
            'average_rating', 'review_count', 'in_stock',
            'created_at',
        ]


class ProductDetailSerializer(serializers.ModelSerializer):
    """Full serializer for product detail page."""
    brand = BrandSerializer(read_only=True)
    category = CategorySerializer(read_only=True)
    images = ProductImageSerializer(many=True, read_only=True)
    variants = ProductVariantSerializer(many=True, read_only=True)
    specifications = ProductSpecificationSerializer(many=True, read_only=True)
    reviews = ReviewSerializer(many=True, read_only=True)
    effective_price_usd = serializers.ReadOnlyField()
    effective_price_kes = serializers.ReadOnlyField()
    discount_percent = serializers.ReadOnlyField()
    average_rating = serializers.ReadOnlyField()
    review_count = serializers.ReadOnlyField()
    in_stock = serializers.ReadOnlyField()
    stock_quantity = serializers.ReadOnlyField()
    rating_breakdown = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'slug', 'sku', 'asin',
            'brand', 'category',
            'description', 'short_description', 'bullet_points', 'condition',
            'images', 'variants', 'specifications', 'reviews',
            'price_usd', 'sale_price_usd', 'effective_price_usd',
            'price_kes', 'sale_price_kes', 'effective_price_kes',
            'discount_percent',
            'is_featured', 'is_best_seller', 'is_new_arrival',
            'is_amazon_choice', 'is_prime',
            'has_coupon', 'coupon_text',
            'weight_kg', 'ships_from',
            'average_rating', 'review_count', 'rating_breakdown',
            'in_stock', 'stock_quantity',
            'tags', 'meta_title', 'meta_description',
            'created_at', 'updated_at',
        ]

    def get_rating_breakdown(self, obj):
        breakdown = {5: 0, 4: 0, 3: 0, 2: 0, 1: 0}
        reviews = obj.reviews.filter(is_approved=True)
        total = reviews.count()
        for r in reviews:
            breakdown[r.rating] = breakdown.get(r.rating, 0) + 1
        return {
            k: {'count': v, 'percent': round(v / total * 100) if total else 0}
            for k, v in breakdown.items()
        }


# ─── Banner ───────────────────────────────────────────────────────────────────

class BannerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Banner
        fields = ['id', 'title', 'subtitle', 'cta_text', 'image', 'mobile_image',
                  'link', 'position', 'badge_text', 'badge_color', 'bg_color',
                  'text_color', 'order']


# ─── Cart ─────────────────────────────────────────────────────────────────────

class CartItemSerializer(serializers.ModelSerializer):
    product = ProductListSerializer(read_only=True)
    product_id = serializers.UUIDField(write_only=True)
    variant = ProductVariantSerializer(read_only=True)
    variant_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    subtotal_usd = serializers.ReadOnlyField()
    subtotal_kes = serializers.ReadOnlyField()
    unit_price_usd = serializers.ReadOnlyField()
    unit_price_kes = serializers.ReadOnlyField()

    class Meta:
        model = CartItem
        fields = ['id', 'product', 'product_id', 'variant', 'variant_id',
                  'quantity', 'unit_price_usd', 'unit_price_kes',
                  'subtotal_usd', 'subtotal_kes', 'added_at']

    def create(self, validated_data):
        from .models import Product, ProductVariant
        product_id = validated_data.pop('product_id')
        variant_id = validated_data.pop('variant_id', None)
        cart = validated_data['cart']
        product = Product.objects.get(id=product_id)
        variant = ProductVariant.objects.get(id=variant_id) if variant_id else None
        item, created = CartItem.objects.get_or_create(
            cart=cart, product=product, variant=variant,
            defaults={'quantity': validated_data.get('quantity', 1)}
        )
        if not created:
            item.quantity += validated_data.get('quantity', 1)
            item.save()
        return item


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    total_usd = serializers.ReadOnlyField()
    total_kes = serializers.ReadOnlyField()
    item_count = serializers.ReadOnlyField()

    class Meta:
        model = Cart
        fields = ['id', 'items', 'total_usd', 'total_kes', 'item_count', 'currency', 'updated_at']


# ─── Address ──────────────────────────────────────────────────────────────────

class AddressSerializer(serializers.ModelSerializer):
    county_name = serializers.CharField(source='county.name', read_only=True)
    country_name = serializers.CharField(source='country.name', read_only=True)
    county_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    country_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = Address
        fields = ['id', 'full_name', 'phone', 'address_line1', 'address_line2',
                  'city', 'county', 'county_id', 'county_name',
                  'country', 'country_id', 'country_name',
                  'postal_code', 'is_default', 'created_at']
        read_only_fields = ['id', 'created_at']

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        county_id = validated_data.pop('county_id', None)
        country_id = validated_data.pop('country_id', None)
        if county_id:
            validated_data['county_id'] = county_id
        if country_id:
            validated_data['country_id'] = country_id
        return super().create(validated_data)


# ─── Order ────────────────────────────────────────────────────────────────────

class OrderItemSerializer(serializers.ModelSerializer):
    subtotal = serializers.ReadOnlyField()

    class Meta:
        model = OrderItem
        fields = ['id', 'product', 'product_name', 'variant_name',
                  'sku', 'image_url', 'price', 'quantity', 'subtotal', 'currency']


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    shipping_county_name = serializers.CharField(source='shipping_county.name', read_only=True)
    shipping_country_name = serializers.CharField(source='shipping_country.name', read_only=True)
    pickup_station_detail = PickupStationSerializer(source='pickup_station', read_only=True)

    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'status', 'payment_status', 'payment_method', 'currency',
            'full_name', 'email', 'phone',
            'delivery_type', 'pickup_station', 'pickup_station_detail',
            'shipping_address', 'shipping_city',
            'shipping_county', 'shipping_county_name',
            'shipping_country', 'shipping_country_name',
            'shipping_postal_code',
            'subtotal', 'shipping_fee', 'tax', 'discount', 'total',
            'mpesa_phone', 'paypal_order_id',
            'notes', 'tracking_number', 'estimated_delivery',
            'items', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'order_number', 'status', 'payment_status',
                            'mpesa_checkout_request_id', 'mpesa_transaction_id',
                            'paypal_capture_id']


class OrderCreateSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=200)
    email = serializers.EmailField()
    phone = serializers.CharField(max_length=20)
    payment_method = serializers.ChoiceField(choices=['mpesa', 'paypal', 'card', 'cod'])
    currency = serializers.ChoiceField(choices=['USD', 'KES'], default='USD')
    delivery_type = serializers.ChoiceField(choices=['home', 'pickup'], default='home')
    pickup_station_id = serializers.IntegerField(required=False, allow_null=True)
    shipping_address = serializers.CharField(required=False, allow_blank=True)
    shipping_city = serializers.CharField(required=False, allow_blank=True)
    shipping_county_id = serializers.IntegerField(required=False, allow_null=True)
    shipping_country_id = serializers.IntegerField(required=False, allow_null=True)
    shipping_postal_code = serializers.CharField(required=False, allow_blank=True)
    coupon_code = serializers.CharField(required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)
    mpesa_phone = serializers.CharField(required=False, allow_blank=True)


# ─── User & Auth ──────────────────────────────────────────────────────────────

class UserProfileSerializer(serializers.ModelSerializer):
    preferred_country = CountrySerializer(read_only=True)

    class Meta:
        model = UserProfile
        fields = ['phone', 'avatar', 'date_of_birth', 'preferred_currency',
                  'preferred_country', 'newsletter_subscribed']


class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'profile', 'date_joined']
        read_only_fields = ['id', 'date_joined']


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password2 = serializers.CharField(write_only=True)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    first_name = serializers.CharField(required=True)
    last_name = serializers.CharField(required=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'first_name', 'last_name', 'password', 'password2', 'phone']

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({'password': 'Passwords do not match.'})
        if User.objects.filter(email=attrs['email']).exists():
            raise serializers.ValidationError({'email': 'An account with this email already exists.'})
        return attrs

    def create(self, validated_data):
        phone = validated_data.pop('phone', '')
        validated_data.pop('password2')
        password = validated_data.pop('password')
        user = User.objects.create_user(password=password, **validated_data)
        UserProfile.objects.create(user=user, phone=phone)
        return user


# ─── Wishlist & Recently Viewed ───────────────────────────────────────────────

class WishlistSerializer(serializers.ModelSerializer):
    product = ProductListSerializer(read_only=True)

    class Meta:
        model = Wishlist
        fields = ['id', 'product', 'added_at']


class RecentlyViewedSerializer(serializers.ModelSerializer):
    product = ProductListSerializer(read_only=True)

    class Meta:
        model = RecentlyViewed
        fields = ['product', 'viewed_at']


# ─── Payment ──────────────────────────────────────────────────────────────────

class MpesaSTKSerializer(serializers.Serializer):
    phone = serializers.CharField(max_length=20)
    order_id = serializers.UUIDField()

    def validate_phone(self, value):
        phone = value.replace('+', '').replace(' ', '').replace('-', '')
        if phone.startswith('0'):
            phone = '254' + phone[1:]
        elif not phone.startswith('254'):
            phone = '254' + phone
        if not phone.startswith('254') or len(phone) != 12:
            raise serializers.ValidationError('Enter a valid Kenyan phone number.')
        return phone


class PayPalCreateOrderSerializer(serializers.Serializer):
    order_id = serializers.UUIDField()


class PayPalCaptureSerializer(serializers.Serializer):
    order_id = serializers.UUIDField()
    paypal_order_id = serializers.CharField()


class CouponSerializer(serializers.ModelSerializer):
    class Meta:
        model = Coupon
        fields = ['code', 'description', 'discount_type', 'discount_value', 'min_order_value']


class ExchangeRateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExchangeRate
        fields = ['from_currency', 'to_currency', 'rate', 'updated_at']