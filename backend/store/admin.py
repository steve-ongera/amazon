from django.contrib import admin
from django.utils.html import format_html
from django.db.models import Count, Sum
from django.utils.text import slugify

from .models import (
    Country, County, PickupStation,
    Category, Brand, Product, ProductVariant, ProductImage,
    ProductSpecification, Review, Banner,
    Cart, CartItem, Address, Order, OrderItem,
    MpesaTransaction, PayPalTransaction,
    UserProfile, Wishlist, RecentlyViewed,
    Coupon, ExchangeRate,
)


# ── Helpers ───────────────────────────────────────────────────────────────────

def thumbnail(image_field, size=60):
    if image_field:
        return format_html(
            '<img src="{}" style="width:{}px;height:{}px;object-fit:cover;border-radius:4px;" />',
            image_field.url, size, size
        )
    return '—'


# ── Geography ─────────────────────────────────────────────────────────────────

@admin.register(Country)
class CountryAdmin(admin.ModelAdmin):
    list_display  = ('flag_emoji', 'name', 'code', 'currency_code', 'currency_symbol', 'is_active')
    list_editable = ('is_active',)
    search_fields = ('name', 'code')
    ordering      = ('name',)


class PickupStationInline(admin.TabularInline):
    model  = PickupStation
    extra  = 0
    fields = ('name', 'address', 'phone', 'delivery_fee_kes', 'is_active')


@admin.register(County)
class CountyAdmin(admin.ModelAdmin):
    list_display  = ('name', 'country', 'slug', 'is_active')
    list_filter   = ('country', 'is_active')
    search_fields = ('name',)
    inlines       = [PickupStationInline]


@admin.register(PickupStation)
class PickupStationAdmin(admin.ModelAdmin):
    list_display  = ('name', 'county', 'phone', 'delivery_fee_kes', 'operating_hours', 'is_active')
    list_filter   = ('county__country', 'is_active')
    search_fields = ('name', 'address')
    list_editable = ('is_active', 'delivery_fee_kes')


# ── Catalogue ─────────────────────────────────────────────────────────────────

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display  = ('thumb', 'name', 'parent', 'slug', 'is_featured', 'is_active', 'order', 'product_count')
    list_editable = ('is_featured', 'is_active', 'order')
    list_filter   = ('is_active', 'is_featured', 'parent')
    search_fields = ('name', 'slug')
    prepopulated_fields = {'slug': ('name',)}
    ordering      = ('order', 'name')

    def thumb(self, obj):
        return thumbnail(obj.image, 40)
    thumb.short_description = ''

    def product_count(self, obj):
        return obj.products.count()
    product_count.short_description = 'Products'

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(_pc=Count('products'))


@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
    list_display  = ('logo_thumb', 'name', 'slug', 'is_featured', 'is_active', 'product_count')
    list_editable = ('is_featured', 'is_active')
    search_fields = ('name',)
    prepopulated_fields = {'slug': ('name',)}

    def logo_thumb(self, obj):
        return thumbnail(obj.logo, 40)
    logo_thumb.short_description = ''

    def product_count(self, obj):
        return obj.products.count()
    product_count.short_description = 'Products'


# ── Product inlines ───────────────────────────────────────────────────────────

class ProductImageInline(admin.TabularInline):
    model   = ProductImage
    extra   = 1
    fields  = ('thumb', 'image', 'alt_text', 'is_primary', 'order')
    readonly_fields = ('thumb',)

    def thumb(self, obj):
        return thumbnail(obj.image, 50)
    thumb.short_description = ''


class ProductVariantInline(admin.TabularInline):
    model  = ProductVariant
    extra  = 1
    fields = ('name', 'color', 'storage', 'ram', 'price_usd', 'price_kes', 'sale_price_usd', 'sale_price_kes', 'stock', 'is_active')


class ProductSpecificationInline(admin.TabularInline):
    model  = ProductSpecification
    extra  = 2
    fields = ('group', 'key', 'value', 'order')


class ReviewInline(admin.TabularInline):
    model     = Review
    extra     = 0
    fields    = ('user', 'rating', 'title', 'is_approved', 'is_verified_purchase', 'created_at')
    readonly_fields = ('created_at',)
    show_change_link = True


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display  = (
        'main_thumb', 'name', 'brand', 'category',
        'price_usd', 'sale_price_usd', 'price_kes',
        'stock_qty', 'in_stock_badge',
        'is_featured', 'is_best_seller', 'is_new_arrival', 'is_active',
    )
    list_editable = ('is_featured', 'is_best_seller', 'is_new_arrival')
    list_filter   = (
        'is_active', 'is_featured', 'is_best_seller', 'is_new_arrival',
        'is_amazon_choice', 'is_prime', 'condition',
        'brand', 'category',
    )
    search_fields = ('name', 'slug', 'sku', 'asin')
    prepopulated_fields = {'slug': ('name',)}
    readonly_fields   = ('id', 'sku', 'asin', 'created_at', 'updated_at', 'effective_price_usd', 'discount_percent', 'average_rating', 'review_count')
    inlines           = [ProductImageInline, ProductVariantInline, ProductSpecificationInline, ReviewInline]
    save_on_top       = True
    date_hierarchy    = 'created_at'
    ordering          = ('-created_at',)

    fieldsets = (
        ('Identity', {
            'fields': ('id', 'name', 'slug', 'sku', 'asin', 'brand', 'category', 'condition')
        }),
        ('Content', {
            'fields': ('short_description', 'description', 'bullet_points')
        }),
        ('Pricing', {
            'fields': (
                ('price_usd', 'sale_price_usd', 'effective_price_usd', 'discount_percent'),
                ('price_kes', 'sale_price_kes'),
            )
        }),
        ('Flags', {
            'fields': (
                ('is_active', 'is_prime'),
                ('is_featured', 'is_best_seller', 'is_new_arrival', 'is_amazon_choice'),
                ('has_coupon', 'coupon_text'),
            )
        }),
        ('SEO & Shipping', {
            'classes': ('collapse',),
            'fields': ('meta_title', 'meta_description', 'tags', 'weight_kg', 'ships_from')
        }),
        ('Stats', {
            'fields': ('average_rating', 'review_count', 'created_at', 'updated_at')
        }),
    )

    def main_thumb(self, obj):
        return thumbnail(obj.main_image.image if obj.main_image else None, 48)
    main_thumb.short_description = ''

    def stock_qty(self, obj):
        qty = obj.stock_quantity
        color = '#007600' if qty > 10 else ('#e47911' if qty > 0 else '#b12704')
        return format_html('<span style="color:{};font-weight:700;">{}</span>', color, qty)
    stock_qty.short_description = 'Stock'

    def in_stock_badge(self, obj):
        if obj.in_stock:
            return format_html('<span style="color:#007600;">✔ In Stock</span>')
        return format_html('<span style="color:#b12704;">✘ Out</span>')
    in_stock_badge.short_description = 'Avail.'


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display  = ('product', 'user', 'rating', 'title', 'is_approved', 'is_verified_purchase', 'helpful_votes', 'created_at')
    list_editable = ('is_approved',)
    list_filter   = ('is_approved', 'is_verified_purchase', 'rating')
    search_fields = ('product__name', 'user__username', 'title', 'comment')
    date_hierarchy = 'created_at'
    readonly_fields = ('created_at',)


@admin.register(Banner)
class BannerAdmin(admin.ModelAdmin):
    list_display  = ('thumb', 'title', 'position', 'order', 'is_active')
    list_editable = ('order', 'is_active', 'position')
    list_filter   = ('position', 'is_active')
    search_fields = ('title',)
    ordering      = ('position', 'order')

    def thumb(self, obj):
        return thumbnail(obj.image, 80)
    thumb.short_description = ''


# ── Commerce ──────────────────────────────────────────────────────────────────

class CartItemInline(admin.TabularInline):
    model     = CartItem
    extra     = 0
    fields    = ('product', 'variant', 'quantity', 'unit_price_kes', 'subtotal_kes')
    readonly_fields = ('unit_price_kes', 'subtotal_kes')

    def unit_price_kes(self, obj):
        return f'KES {obj.unit_price_kes:,.0f}'

    def subtotal_kes(self, obj):
        return f'KES {obj.subtotal_kes:,.0f}'


@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display  = ('id', 'user', 'session_key', 'item_count', 'total_kes_display', 'currency', 'updated_at')
    list_filter   = ('currency',)
    search_fields = ('user__username', 'session_key')
    inlines       = [CartItemInline]
    readonly_fields = ('total_usd', 'total_kes', 'item_count')

    def total_kes_display(self, obj):
        return f'KES {obj.total_kes:,.0f}'
    total_kes_display.short_description = 'Total (KES)'


@admin.register(Address)
class AddressAdmin(admin.ModelAdmin):
    list_display  = ('full_name', 'user', 'city', 'county', 'phone', 'is_default')
    list_filter   = ('is_default', 'county__country')
    search_fields = ('full_name', 'user__username', 'city', 'phone')


# ── Order ─────────────────────────────────────────────────────────────────────

class OrderItemInline(admin.TabularInline):
    model     = OrderItem
    extra     = 0
    fields    = ('product_name', 'variant_name', 'sku', 'quantity', 'price', 'subtotal_display', 'currency')
    readonly_fields = ('subtotal_display',)

    def subtotal_display(self, obj):
        return f'{obj.currency} {obj.subtotal:,.2f}'
    subtotal_display.short_description = 'Subtotal'


class MpesaTransactionInline(admin.TabularInline):
    model     = MpesaTransaction
    extra     = 0
    fields    = ('checkout_request_id', 'phone', 'amount', 'status', 'mpesa_receipt', 'created_at')
    readonly_fields = ('created_at',)


class PayPalTransactionInline(admin.TabularInline):
    model     = PayPalTransaction
    extra     = 0
    fields    = ('paypal_order_id', 'capture_id', 'amount', 'currency', 'status', 'created_at')
    readonly_fields = ('created_at',)


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display  = (
        'order_number', 'full_name', 'status_badge', 'payment_status_badge',
        'payment_method', 'total_display', 'currency',
        'delivery_type', 'created_at',
    )
    list_filter   = ('status', 'payment_status', 'payment_method', 'delivery_type', 'currency')
    search_fields = ('order_number', 'full_name', 'email', 'phone', 'mpesa_transaction_id', 'paypal_order_id')
    readonly_fields = (
        'id', 'order_number', 'created_at', 'updated_at',
        'mpesa_checkout_request_id', 'mpesa_transaction_id',
        'paypal_order_id', 'paypal_capture_id',
    )
    date_hierarchy  = 'created_at'
    ordering        = ('-created_at',)
    inlines         = [OrderItemInline, MpesaTransactionInline, PayPalTransactionInline]
    save_on_top     = True

    fieldsets = (
        ('Order Info', {
            'fields': ('id', 'order_number', 'user', 'status', 'notes')
        }),
        ('Customer', {
            'fields': ('full_name', 'email', 'phone')
        }),
        ('Delivery', {
            'fields': ('delivery_type', 'pickup_station', 'shipping_address', 'shipping_city', 'shipping_county', 'shipping_country', 'tracking_number', 'estimated_delivery')
        }),
        ('Financials', {
            'fields': (('subtotal', 'shipping_fee', 'tax', 'discount', 'total'), 'currency')
        }),
        ('Payment', {
            'fields': (
                'payment_method', 'payment_status',
                'mpesa_checkout_request_id', 'mpesa_transaction_id', 'mpesa_phone',
                'paypal_order_id', 'paypal_capture_id',
            )
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )

    STATUS_COLORS = {
        'pending': '#856404', 'payment_pending': '#856404',
        'confirmed': '#004085', 'processing': '#155724',
        'shipped': '#0c5460', 'out_for_delivery': '#0c5460',
        'delivered': '#155724', 'cancelled': '#721c24',
        'refunded': '#383d41', 'returned': '#383d41',
    }
    STATUS_BG = {
        'pending': '#fff3cd', 'payment_pending': '#fff3cd',
        'confirmed': '#cce5ff', 'processing': '#d4edda',
        'shipped': '#d1ecf1', 'out_for_delivery': '#d1ecf1',
        'delivered': '#d4edda', 'cancelled': '#f8d7da',
        'refunded': '#e2e3e5', 'returned': '#e2e3e5',
    }

    def status_badge(self, obj):
        color = self.STATUS_COLORS.get(obj.status, '#333')
        bg    = self.STATUS_BG.get(obj.status, '#eee')
        return format_html(
            '<span style="background:{};color:{};padding:3px 10px;border-radius:12px;font-size:.78rem;font-weight:700;">{}</span>',
            bg, color, obj.get_status_display()
        )
    status_badge.short_description = 'Status'

    def payment_status_badge(self, obj):
        colors = {'pending': '#856404', 'paid': '#155724', 'failed': '#721c24', 'refunded': '#383d41'}
        bgs    = {'pending': '#fff3cd', 'paid': '#d4edda', 'failed': '#f8d7da', 'refunded': '#e2e3e5'}
        color  = colors.get(obj.payment_status, '#333')
        bg     = bgs.get(obj.payment_status, '#eee')
        return format_html(
            '<span style="background:{};color:{};padding:3px 10px;border-radius:12px;font-size:.78rem;font-weight:700;">{}</span>',
            bg, color, obj.get_payment_status_display()
        )
    payment_status_badge.short_description = 'Payment'

    def total_display(self, obj):
        return format_html('<strong>{} {:,.2f}</strong>', obj.currency, obj.total)
    total_display.short_description = 'Total'


# ── Payments ──────────────────────────────────────────────────────────────────

@admin.register(MpesaTransaction)
class MpesaTransactionAdmin(admin.ModelAdmin):
    list_display  = ('checkout_request_id', 'order', 'phone', 'amount', 'status_badge', 'mpesa_receipt', 'created_at')
    list_filter   = ('status',)
    search_fields = ('checkout_request_id', 'phone', 'mpesa_receipt', 'order__order_number')
    readonly_fields = ('created_at', 'updated_at')
    date_hierarchy  = 'created_at'

    def status_badge(self, obj):
        colors = {'pending': '#856404', 'success': '#155724', 'failed': '#721c24'}
        bgs    = {'pending': '#fff3cd', 'success': '#d4edda', 'failed': '#f8d7da'}
        return format_html(
            '<span style="background:{};color:{};padding:2px 8px;border-radius:10px;font-size:.78rem;font-weight:700;">{}</span>',
            bgs.get(obj.status, '#eee'), colors.get(obj.status, '#333'), obj.status.title()
        )
    status_badge.short_description = 'Status'


@admin.register(PayPalTransaction)
class PayPalTransactionAdmin(admin.ModelAdmin):
    list_display  = ('paypal_order_id', 'order', 'amount', 'currency', 'status', 'created_at')
    list_filter   = ('status', 'currency')
    search_fields = ('paypal_order_id', 'capture_id', 'order__order_number')
    readonly_fields = ('created_at', 'updated_at', 'raw_response')
    date_hierarchy  = 'created_at'


# ── User Extensions ───────────────────────────────────────────────────────────

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display  = ('user', 'phone', 'preferred_currency', 'preferred_country', 'newsletter_subscribed', 'created_at')
    list_filter   = ('preferred_currency', 'newsletter_subscribed')
    search_fields = ('user__username', 'user__email', 'phone')
    raw_id_fields = ('user',)


@admin.register(Wishlist)
class WishlistAdmin(admin.ModelAdmin):
    list_display  = ('user', 'product', 'added_at')
    list_filter   = ('added_at',)
    search_fields = ('user__username', 'product__name')
    date_hierarchy = 'added_at'


@admin.register(RecentlyViewed)
class RecentlyViewedAdmin(admin.ModelAdmin):
    list_display  = ('user', 'session_key', 'product', 'viewed_at')
    search_fields = ('user__username', 'product__name')
    date_hierarchy = 'viewed_at'


# ── Utilities ─────────────────────────────────────────────────────────────────

@admin.register(Coupon)
class CouponAdmin(admin.ModelAdmin):
    list_display  = ('code', 'discount_type', 'discount_value', 'min_order_value', 'used_count', 'max_uses', 'is_active', 'valid_from', 'valid_until')
    list_editable = ('is_active',)
    list_filter   = ('discount_type', 'is_active')
    search_fields = ('code', 'description')
    filter_horizontal = ('categories',)

    def usage_bar(self, obj):
        if not obj.max_uses:
            return f'{obj.used_count} / ∞'
        pct = int(obj.used_count / obj.max_uses * 100)
        color = '#007600' if pct < 70 else ('#e47911' if pct < 90 else '#b12704')
        return format_html(
            '<div style="width:100px;background:#eee;border-radius:4px;overflow:hidden;">'
            '<div style="width:{}%;background:{};height:10px;"></div></div>'
            '<small>{}/{}</small>',
            min(pct, 100), color, obj.used_count, obj.max_uses
        )
    usage_bar.short_description = 'Usage'


@admin.register(ExchangeRate)
class ExchangeRateAdmin(admin.ModelAdmin):
    list_display  = ('from_currency', 'to_currency', 'rate', 'updated_at')
    list_editable = ('rate',)
    search_fields = ('from_currency', 'to_currency')


# ── Admin Site Branding ───────────────────────────────────────────────────────

admin.site.site_header  = 'Aamazon Kenya — Admin'
admin.site.site_title   = 'Amazon Admin'
admin.site.index_title  = 'Store Management'