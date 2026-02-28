from django.db import models
from django.contrib.auth.models import User
from django.utils.text import slugify
from django.core.validators import MinValueValidator, MaxValueValidator
import uuid


# ─── Geography ────────────────────────────────────────────────────────────────

class Country(models.Model):
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=3, unique=True)          # ISO 3166-1 alpha-2/3
    currency_code = models.CharField(max_length=10, default='USD')
    currency_symbol = models.CharField(max_length=5, default='$')
    flag_emoji = models.CharField(max_length=10, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name_plural = 'Countries'
        ordering = ['name']

    def __str__(self):
        return self.name


class County(models.Model):
    """Sub-region within a country (e.g. Kenyan county, US state)."""
    country = models.ForeignKey(Country, on_delete=models.CASCADE, related_name='counties')
    name = models.CharField(max_length=100)
    slug = models.SlugField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name_plural = 'Counties'
        ordering = ['name']
        unique_together = ['country', 'slug']

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name}, {self.country.name}"


class PickupStation(models.Model):
    county = models.ForeignKey(County, on_delete=models.CASCADE, related_name='pickup_stations')
    name = models.CharField(max_length=200)
    slug = models.SlugField(blank=True)
    address = models.TextField()
    phone = models.CharField(max_length=20, blank=True)
    operating_hours = models.CharField(max_length=200, blank=True, default='Mon-Sat 8AM-6PM')
    delivery_fee_usd = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    delivery_fee_kes = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['county', 'name']

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.county.name})"


# ─── Catalogue ────────────────────────────────────────────────────────────────

class Category(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True, blank=True)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=100, blank=True)
    image = models.ImageField(upload_to='categories/', blank=True, null=True)
    banner_image = models.ImageField(upload_to='category_banners/', blank=True, null=True)
    parent = models.ForeignKey(
        'self', on_delete=models.SET_NULL, null=True, blank=True, related_name='subcategories'
    )
    is_active = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0)
    meta_title = models.CharField(max_length=200, blank=True)
    meta_description = models.CharField(max_length=300, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = 'Categories'
        ordering = ['order', 'name']

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def get_absolute_url(self):
        return f"/category/{self.slug}/"

    def __str__(self):
        return self.name


class Brand(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True, blank=True)
    logo = models.ImageField(upload_to='brands/', blank=True, null=True)
    description = models.TextField(blank=True)
    website = models.URLField(blank=True)
    is_featured = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Product(models.Model):
    CONDITION_CHOICES = [
        ('new', 'New'),
        ('refurbished', 'Refurbished'),
        ('used_like_new', 'Used – Like New'),
        ('used_good', 'Used – Good'),
        ('used_acceptable', 'Used – Acceptable'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    slug = models.SlugField(unique=True, blank=True, max_length=300)
    sku = models.CharField(max_length=100, unique=True, blank=True)
    asin = models.CharField(max_length=20, unique=True, blank=True, help_text='Amazon-style identifier')
    brand = models.ForeignKey(Brand, on_delete=models.SET_NULL, null=True, blank=True, related_name='products')
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, related_name='products')
    description = models.TextField(blank=True)
    short_description = models.CharField(max_length=500, blank=True)
    bullet_points = models.JSONField(default=list, blank=True, help_text='List of feature bullet points')
    condition = models.CharField(max_length=20, choices=CONDITION_CHOICES, default='new')

    # Pricing (USD base, KES computed or stored)
    price_usd = models.DecimalField(max_digits=12, decimal_places=2)
    sale_price_usd = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    price_kes = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    sale_price_kes = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)

    # Flags
    is_active = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)
    is_best_seller = models.BooleanField(default=False)
    is_new_arrival = models.BooleanField(default=False)
    is_amazon_choice = models.BooleanField(default=False)
    is_prime = models.BooleanField(default=True)
    has_coupon = models.BooleanField(default=False)
    coupon_text = models.CharField(max_length=100, blank=True)

    # SEO
    meta_title = models.CharField(max_length=200, blank=True)
    meta_description = models.CharField(max_length=300, blank=True)
    tags = models.CharField(max_length=500, blank=True)

    # Shipping
    weight_kg = models.DecimalField(max_digits=8, decimal_places=3, default=0)
    ships_from = models.CharField(max_length=100, blank=True, default='Fulfilled by Amazon')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.name)
            self.slug = f"{base}-{str(self.id)[:8]}"
        if not self.sku:
            self.sku = f"AMZ-{str(self.id)[:8].upper()}"
        if not self.asin:
            import random, string
            self.asin = 'B0' + ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
        super().save(*args, **kwargs)

    @property
    def effective_price_usd(self):
        return self.sale_price_usd or self.price_usd

    @property
    def effective_price_kes(self):
        return self.sale_price_kes or self.price_kes

    @property
    def discount_percent(self):
        if self.sale_price_usd and self.price_usd > 0:
            return round((1 - self.sale_price_usd / self.price_usd) * 100)
        return 0

    @property
    def average_rating(self):
        reviews = self.reviews.filter(is_approved=True)
        if reviews.exists():
            return round(sum(r.rating for r in reviews) / reviews.count(), 1)
        return 0

    @property
    def review_count(self):
        return self.reviews.filter(is_approved=True).count()

    @property
    def main_image(self):
        return self.images.filter(is_primary=True).first() or self.images.first()

    @property
    def in_stock(self):
        return self.variants.filter(is_active=True, stock__gt=0).exists() or \
               self.stock_quantity > 0

    @property
    def stock_quantity(self):
        total = sum(v.stock for v in self.variants.filter(is_active=True))
        return total

    def get_absolute_url(self):
        return f"/dp/{self.slug}/"

    def __str__(self):
        return self.name


class ProductVariant(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='variants')
    name = models.CharField(max_length=150)
    sku = models.CharField(max_length=100, unique=True, blank=True)

    # Variant attributes
    color = models.CharField(max_length=50, blank=True)
    color_hex = models.CharField(max_length=7, blank=True)
    size = models.CharField(max_length=50, blank=True)
    storage = models.CharField(max_length=50, blank=True)
    ram = models.CharField(max_length=50, blank=True)
    style = models.CharField(max_length=100, blank=True)

    # Pricing overrides (if different from parent)
    price_usd = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    sale_price_usd = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    price_kes = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    sale_price_kes = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)

    stock = models.PositiveIntegerField(default=0)
    image = models.ImageField(upload_to='variant_images/', blank=True, null=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['name']

    def save(self, *args, **kwargs):
        if not self.sku:
            self.sku = f"VAR-{uuid.uuid4().hex[:8].upper()}"
        super().save(*args, **kwargs)

    @property
    def effective_price_usd(self):
        return self.sale_price_usd or self.price_usd or self.product.effective_price_usd

    @property
    def effective_price_kes(self):
        return self.sale_price_kes or self.price_kes or self.product.effective_price_kes

    def __str__(self):
        return f"{self.product.name} – {self.name}"


class ProductImage(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='products/')
    alt_text = models.CharField(max_length=200, blank=True)
    is_primary = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']

    def save(self, *args, **kwargs):
        if self.is_primary:
            ProductImage.objects.filter(product=self.product, is_primary=True).update(is_primary=False)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Image for {self.product.name}"


class ProductSpecification(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='specifications')
    group = models.CharField(max_length=100, blank=True, help_text='e.g. Technical Details')
    key = models.CharField(max_length=100)
    value = models.CharField(max_length=500)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"{self.product.name}: {self.key}"


class Review(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='reviews')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reviews')
    rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    title = models.CharField(max_length=200, blank=True)
    comment = models.TextField()
    pros = models.TextField(blank=True)
    cons = models.TextField(blank=True)
    is_verified_purchase = models.BooleanField(default=False)
    is_approved = models.BooleanField(default=True)
    helpful_votes = models.PositiveIntegerField(default=0)
    images = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['product', 'user']
        ordering = ['-helpful_votes', '-created_at']

    def __str__(self):
        return f"{self.user.username} – {self.rating}★ on {self.product.name}"


class Banner(models.Model):
    POSITION_CHOICES = [
        ('hero', 'Hero Slider'),
        ('promo_strip', 'Promo Strip'),
        ('category_feature', 'Category Feature'),
        ('sidebar', 'Sidebar'),
    ]
    title = models.CharField(max_length=200)
    subtitle = models.CharField(max_length=300, blank=True)
    cta_text = models.CharField(max_length=100, blank=True, default='Shop now')
    image = models.ImageField(upload_to='banners/')
    mobile_image = models.ImageField(upload_to='banners/', blank=True, null=True)
    link = models.CharField(max_length=500, blank=True)
    position = models.CharField(max_length=30, choices=POSITION_CHOICES, default='hero')
    badge_text = models.CharField(max_length=50, blank=True)
    badge_color = models.CharField(max_length=20, default='orange')
    bg_color = models.CharField(max_length=20, blank=True, default='#f3f4f6')
    text_color = models.CharField(max_length=20, blank=True, default='#111111')
    is_active = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return self.title


# ─── Commerce ─────────────────────────────────────────────────────────────────

class Cart(models.Model):
    CURRENCY_CHOICES = [('USD', 'US Dollar'), ('KES', 'Kenyan Shilling')]

    user = models.OneToOneField(User, on_delete=models.CASCADE, null=True, blank=True, related_name='cart')
    session_key = models.CharField(max_length=40, null=True, blank=True)
    currency = models.CharField(max_length=3, choices=CURRENCY_CHOICES, default='USD')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def total_usd(self):
        return sum(item.subtotal_usd for item in self.items.all())

    @property
    def total_kes(self):
        return sum(item.subtotal_kes for item in self.items.all())

    @property
    def item_count(self):
        return sum(item.quantity for item in self.items.all())

    def __str__(self):
        return f"Cart ({self.user or self.session_key})"


class CartItem(models.Model):
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    variant = models.ForeignKey(ProductVariant, on_delete=models.SET_NULL, null=True, blank=True)
    quantity = models.PositiveIntegerField(default=1)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['cart', 'product', 'variant']

    @property
    def unit_price_usd(self):
        if self.variant:
            return self.variant.effective_price_usd
        return self.product.effective_price_usd

    @property
    def unit_price_kes(self):
        if self.variant:
            return self.variant.effective_price_kes
        return self.product.effective_price_kes

    @property
    def subtotal_usd(self):
        return self.unit_price_usd * self.quantity

    @property
    def subtotal_kes(self):
        return self.unit_price_kes * self.quantity

    def __str__(self):
        return f"{self.quantity}× {self.product.name}"


class Address(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='addresses')
    full_name = models.CharField(max_length=200)
    phone = models.CharField(max_length=20)
    address_line1 = models.CharField(max_length=200)
    address_line2 = models.CharField(max_length=200, blank=True)
    city = models.CharField(max_length=100)
    county = models.ForeignKey(County, on_delete=models.SET_NULL, null=True, blank=True)
    country = models.ForeignKey(Country, on_delete=models.SET_NULL, null=True)
    postal_code = models.CharField(max_length=20, blank=True)
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = 'Addresses'
        ordering = ['-is_default', '-created_at']

    def save(self, *args, **kwargs):
        if self.is_default:
            Address.objects.filter(user=self.user, is_default=True).update(is_default=False)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.full_name} – {self.city}"


class Order(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('payment_pending', 'Awaiting Payment'),
        ('confirmed', 'Confirmed'),
        ('processing', 'Processing'),
        ('shipped', 'Shipped'),
        ('out_for_delivery', 'Out for Delivery'),
        ('delivered', 'Delivered'),
        ('cancelled', 'Cancelled'),
        ('refunded', 'Refunded'),
        ('returned', 'Returned'),
    ]
    PAYMENT_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('paid', 'Paid'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
        ('partially_refunded', 'Partially Refunded'),
    ]
    PAYMENT_METHOD_CHOICES = [
        ('mpesa', 'M-Pesa'),
        ('paypal', 'PayPal'),
        ('card', 'Credit/Debit Card'),
        ('cod', 'Cash on Delivery'),
    ]
    CURRENCY_CHOICES = [('USD', 'USD'), ('KES', 'KES')]
    DELIVERY_CHOICES = [('home', 'Home Delivery'), ('pickup', 'Pickup Station')]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order_number = models.CharField(max_length=25, unique=True, blank=True)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='orders')

    # Status
    status = models.CharField(max_length=25, choices=STATUS_CHOICES, default='pending')
    payment_status = models.CharField(max_length=25, choices=PAYMENT_STATUS_CHOICES, default='pending')
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES, default='mpesa')
    currency = models.CharField(max_length=3, choices=CURRENCY_CHOICES, default='USD')

    # Customer details
    full_name = models.CharField(max_length=200)
    email = models.EmailField()
    phone = models.CharField(max_length=20)

    # Delivery
    delivery_type = models.CharField(max_length=10, choices=DELIVERY_CHOICES, default='home')
    pickup_station = models.ForeignKey(PickupStation, on_delete=models.SET_NULL, null=True, blank=True)
    shipping_address = models.TextField(blank=True)
    shipping_city = models.CharField(max_length=100, blank=True)
    shipping_county = models.ForeignKey(County, on_delete=models.SET_NULL, null=True, blank=True)
    shipping_country = models.ForeignKey(Country, on_delete=models.SET_NULL, null=True, blank=True)
    shipping_postal_code = models.CharField(max_length=20, blank=True)

    # Financials
    subtotal = models.DecimalField(max_digits=14, decimal_places=2)
    shipping_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tax = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    discount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=14, decimal_places=2)

    # Payment refs
    mpesa_checkout_request_id = models.CharField(max_length=200, blank=True)
    mpesa_transaction_id = models.CharField(max_length=200, blank=True)
    mpesa_phone = models.CharField(max_length=20, blank=True)
    paypal_order_id = models.CharField(max_length=200, blank=True)
    paypal_capture_id = models.CharField(max_length=200, blank=True)

    notes = models.TextField(blank=True)
    tracking_number = models.CharField(max_length=100, blank=True)
    estimated_delivery = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.order_number:
            import random, string
            prefix = 'AMZ'
            self.order_number = prefix + '-' + ''.join(random.choices(string.digits, k=10))
        super().save(*args, **kwargs)

    def __str__(self):
        return self.order_number


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True)
    variant = models.ForeignKey(ProductVariant, on_delete=models.SET_NULL, null=True, blank=True)
    product_name = models.CharField(max_length=255)
    variant_name = models.CharField(max_length=150, blank=True)
    sku = models.CharField(max_length=100, blank=True)
    image_url = models.URLField(blank=True)
    price = models.DecimalField(max_digits=12, decimal_places=2)
    quantity = models.PositiveIntegerField()
    currency = models.CharField(max_length=3, default='USD')

    @property
    def subtotal(self):
        return self.price * self.quantity

    def __str__(self):
        return f"{self.quantity}× {self.product_name}"


# ─── Payments ─────────────────────────────────────────────────────────────────

class MpesaTransaction(models.Model):
    STATUS_CHOICES = [('pending', 'Pending'), ('success', 'Success'), ('failed', 'Failed')]
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='mpesa_transactions')
    checkout_request_id = models.CharField(max_length=200, unique=True)
    merchant_request_id = models.CharField(max_length=200, blank=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    phone = models.CharField(max_length=20)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    result_code = models.CharField(max_length=10, blank=True)
    result_desc = models.TextField(blank=True)
    mpesa_receipt = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"M-Pesa {self.checkout_request_id} – {self.status}"


class PayPalTransaction(models.Model):
    STATUS_CHOICES = [('created', 'Created'), ('approved', 'Approved'), ('completed', 'Completed'), ('failed', 'Failed')]
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='paypal_transactions')
    paypal_order_id = models.CharField(max_length=200, unique=True)
    capture_id = models.CharField(max_length=200, blank=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default='USD')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='created')
    raw_response = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"PayPal {self.paypal_order_id} – {self.status}"


# ─── User Extensions ──────────────────────────────────────────────────────────

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    phone = models.CharField(max_length=20, blank=True)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    date_of_birth = models.DateField(null=True, blank=True)
    preferred_currency = models.CharField(max_length=3, default='USD')
    preferred_country = models.ForeignKey(Country, on_delete=models.SET_NULL, null=True, blank=True)
    newsletter_subscribed = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} – Profile"


class Wishlist(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='wishlist')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['user', 'product']
        ordering = ['-added_at']

    def __str__(self):
        return f"{self.user.username} ♥ {self.product.name}"


class RecentlyViewed(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, related_name='recently_viewed')
    session_key = models.CharField(max_length=40, null=True, blank=True)
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    viewed_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-viewed_at']
        unique_together = ['user', 'product']

    def __str__(self):
        return f"{self.product.name} – viewed"


class Coupon(models.Model):
    DISCOUNT_TYPE_CHOICES = [('percent', 'Percentage'), ('fixed_usd', 'Fixed USD'), ('fixed_kes', 'Fixed KES')]
    code = models.CharField(max_length=50, unique=True)
    description = models.CharField(max_length=200, blank=True)
    discount_type = models.CharField(max_length=10, choices=DISCOUNT_TYPE_CHOICES, default='percent')
    discount_value = models.DecimalField(max_digits=10, decimal_places=2)
    min_order_value = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    max_uses = models.PositiveIntegerField(null=True, blank=True)
    used_count = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    valid_from = models.DateTimeField()
    valid_until = models.DateTimeField()
    categories = models.ManyToManyField(Category, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.code


class ExchangeRate(models.Model):
    """Store live exchange rates for currency conversion."""
    from_currency = models.CharField(max_length=3)
    to_currency = models.CharField(max_length=3)
    rate = models.DecimalField(max_digits=14, decimal_places=6)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['from_currency', 'to_currency']

    def __str__(self):
        return f"1 {self.from_currency} = {self.rate} {self.to_currency}"