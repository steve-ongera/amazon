"""
Management command to seed the database with realistic PhonePlace Kenya data.

Usage:
    python manage.py seed_data
    python manage.py seed_data --clear      # wipe existing data first
    python manage.py seed_data --products 50
"""

import os
import random
import glob
from decimal import Decimal
from datetime import datetime, timedelta

from django.core.management.base import BaseCommand
from django.core.files import File
from django.contrib.auth.models import User
from django.utils import timezone
from django.utils.text import slugify


# ── Adjust this import path to match your app name ────────────────────────────
from store.models import (
    Country, County, PickupStation,
    Category, Brand, Product, ProductVariant, ProductImage,
    ProductSpecification, Banner, ExchangeRate,
)

# ── Path to your local images ─────────────────────────────────────────────────
IMAGES_BASE = r'D:\gadaf\Documents\phone_place'


def find_images(subfolder='', extensions=('jpg', 'jpeg', 'png', 'webp')):
    """Recursively find all images under IMAGES_BASE/subfolder."""
    base = os.path.join(IMAGES_BASE, subfolder) if subfolder else IMAGES_BASE
    paths = []
    for ext in extensions:
        paths += glob.glob(os.path.join(base, '**', f'*.{ext}'), recursive=True)
        paths += glob.glob(os.path.join(base, '**', f'*.{ext.upper()}'), recursive=True)
    return list(set(paths))


def pick_image(subfolder=''):
    images = find_images(subfolder)
    if images:
        return random.choice(images)
    # Fallback: any image in base
    all_images = find_images()
    return random.choice(all_images) if all_images else None


class Command(BaseCommand):
    help = 'Seed the database with PhonePlace Kenya sample data'

    def add_arguments(self, parser):
        parser.add_argument('--clear', action='store_true', help='Clear existing data before seeding')
        parser.add_argument('--products', type=int, default=30, help='Number of products to create (default: 30)')

    def handle(self, *args, **options):
        if options['clear']:
            self.stdout.write(self.style.WARNING('Clearing existing data...'))
            self._clear_data()

        self.stdout.write(self.style.HTTP_INFO('Seeding PhonePlace Kenya data...\n'))

        self._seed_exchange_rates()
        country, counties = self._seed_geography()
        self._seed_pickup_stations(counties)
        categories = self._seed_categories()
        brands = self._seed_brands()
        self._seed_banners()
        self._seed_products(categories, brands, options['products'])
        self._seed_superuser()

        self.stdout.write(self.style.SUCCESS('\n✅  Seeding complete!'))

    # ── Helpers ───────────────────────────────────────────────────────────────

    def _clear_data(self):
        models_to_clear = [
            ProductImage, ProductSpecification, ProductVariant, Product,
            Banner, Brand, Category, PickupStation, County,
        ]
        for model in models_to_clear:
            model.objects.all().delete()
        self.stdout.write('  Cleared product & catalogue data.')

    def _attach_image(self, instance, field_name, subfolder='', filename_hint=''):
        """Find a local image and attach it to an ImageField."""
        path = pick_image(subfolder)
        if not path or not os.path.exists(path):
            return
        fname = filename_hint or os.path.basename(path)
        try:
            with open(path, 'rb') as f:
                getattr(instance, field_name).save(fname, File(f), save=True)
        except Exception as e:
            self.stdout.write(self.style.WARNING(f'    ⚠ Could not attach image: {e}'))

    # ── Exchange Rates ─────────────────────────────────────────────────────────

    def _seed_exchange_rates(self):
        rates = [
            ('USD', 'KES', Decimal('129.50')),
            ('KES', 'USD', Decimal('0.00772')),
            ('EUR', 'KES', Decimal('140.20')),
            ('GBP', 'KES', Decimal('163.80')),
        ]
        for fc, tc, rate in rates:
            ExchangeRate.objects.update_or_create(
                from_currency=fc, to_currency=tc,
                defaults={'rate': rate}
            )
        self.stdout.write('  ✓ Exchange rates')

    # ── Geography ─────────────────────────────────────────────────────────────

    def _seed_geography(self):
        kenya, _ = Country.objects.get_or_create(
            code='KE',
            defaults={
                'name': 'Kenya',
                'currency_code': 'KES',
                'currency_symbol': 'KSh',
                'flag_emoji': '🇰🇪',
            }
        )

        county_names = [
            'Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret',
            'Thika', 'Meru', 'Nyeri', 'Machakos', 'Kisii',
        ]
        counties = []
        for name in county_names:
            county, _ = County.objects.get_or_create(
                country=kenya,
                slug=slugify(name),
                defaults={'name': name}
            )
            counties.append(county)

        self.stdout.write('  ✓ Geography (Kenya + 10 counties)')
        return kenya, counties

    # ── Pickup Stations ───────────────────────────────────────────────────────

    def _seed_pickup_stations(self, counties):
        stations = [
            ('Nairobi CBD Station', 'Moi Avenue, Nairobi CBD', '+254 700 111 001', 0),
            ('Westlands Hub',       'Westlands Shopping Centre','+254 700 111 002', 0),
            ('Mombasa Station',     'Digo Road, Mombasa',       '+254 700 111 003', 1),
            ('Kisumu Station',      'Oginga Odinga Street',     '+254 700 111 004', 2),
            ('Nakuru Hub',          'Kenyatta Avenue, Nakuru',  '+254 700 111 005', 3),
        ]
        for name, address, phone, county_idx in stations:
            county = counties[county_idx]
            PickupStation.objects.get_or_create(
                slug=slugify(name),
                defaults={
                    'county': county,
                    'name': name,
                    'address': address,
                    'phone': phone,
                    'delivery_fee_kes': Decimal('200.00'),
                    'delivery_fee_usd': Decimal('1.55'),
                    'operating_hours': 'Mon-Sat 8AM-6PM',
                }
            )
        self.stdout.write('  ✓ Pickup stations')

    # ── Categories ────────────────────────────────────────────────────────────

    def _seed_categories(self):
        cat_data = [
            # (name, icon, is_featured, children)
            ('Phones',        'bi-phone-fill',       True,  ['Smartphones', 'Feature Phones', 'Refurbished Phones']),
            ('Laptops',       'bi-laptop-fill',      True,  ['Gaming Laptops', 'Business Laptops', 'Chromebooks']),
            ('Tablets',       'bi-tablet-landscape', True,  ['Android Tablets', 'iPads']),
            ('Accessories',   'bi-headphones',       True,  ['Chargers & Cables', 'Cases & Covers', 'Screen Protectors']),
            ('Audio',         'bi-speaker-fill',     True,  ['Earbuds', 'Headphones', 'Speakers']),
            ('Smart Watches', 'bi-smartwatch',       True,  []),
            ('Gaming',        'bi-controller',       False, ['Consoles', 'Controllers', 'Gaming Headsets']),
            ('TV & Home',     'bi-tv-fill',          False, ['Smart TVs', 'Streaming Devices']),
        ]

        categories = {}
        for order, (name, icon, featured, children) in enumerate(cat_data):
            parent, _ = Category.objects.get_or_create(
                slug=slugify(name),
                defaults={
                    'name': name,
                    'icon': icon,
                    'is_featured': featured,
                    'order': order,
                }
            )
            # Attach image
            img_path = pick_image()
            if img_path and os.path.exists(img_path):
                try:
                    with open(img_path, 'rb') as f:
                        parent.image.save(f'cat_{slugify(name)}.jpg', File(f), save=True)
                except Exception:
                    pass

            categories[name] = parent
            for child_name in children:
                child, _ = Category.objects.get_or_create(
                    slug=slugify(child_name),
                    defaults={
                        'name': child_name,
                        'parent': parent,
                        'is_featured': False,
                        'order': 0,
                    }
                )
                categories[child_name] = child

        self.stdout.write('  ✓ Categories')
        return categories

    # ── Brands ────────────────────────────────────────────────────────────────

    def _seed_brands(self):
        brand_data = [
            ('Samsung',   True),
            ('Apple',     True),
            ('Xiaomi',    True),
            ('Tecno',     True),
            ('Infinix',   True),
            ('Huawei',    True),
            ('Oppo',      False),
            ('OnePlus',   False),
            ('Nokia',     False),
            ('Lenovo',    False),
            ('HP',        False),
            ('Dell',      False),
            ('Asus',      False),
            ('JBL',       False),
            ('Anker',     False),
        ]
        brands = {}
        for name, featured in brand_data:
            brand, _ = Brand.objects.get_or_create(
                slug=slugify(name),
                defaults={'name': name, 'is_featured': featured}
            )
            img_path = pick_image()
            if img_path and os.path.exists(img_path) and not brand.logo:
                try:
                    with open(img_path, 'rb') as f:
                        brand.logo.save(f'brand_{slugify(name)}.jpg', File(f), save=True)
                except Exception:
                    pass
            brands[name] = brand

        self.stdout.write('  ✓ Brands')
        return brands

    # ── Banners ───────────────────────────────────────────────────────────────

    def _seed_banners(self):
        banner_data = [
            ('Mega Phone Sale',         'Up to 40% off latest smartphones',   'Shop Phones',  'hero',       '/store?category=phones',       0),
            ('New Laptops Arrived',     'Top brands from KES 45,000',          'View Laptops', 'hero',       '/store?category=laptops',      1),
            ('M-Pesa Deals',            'Pay with M-Pesa & save extra 5%',     'Get Deal',     'hero',       '/store?filter=deals',          2),
            ('Accessories Flash Sale',  '24-hour sale on all accessories',     'Shop Now',     'promo_strip','/store?category=accessories',  0),
            ('Free Delivery Nairobi',   'Same-day delivery in Nairobi CBD',    'Learn More',   'promo_strip','/delivery-info',               1),
        ]
        for title, subtitle, cta, position, link, order in banner_data:
            banner, created = Banner.objects.get_or_create(
                title=title,
                defaults={
                    'subtitle': subtitle,
                    'cta_text': cta,
                    'position': position,
                    'link': link,
                    'order': order,
                    'is_active': True,
                }
            )
            if created:
                img_path = pick_image()
                if img_path and os.path.exists(img_path):
                    try:
                        with open(img_path, 'rb') as f:
                            banner.image.save(f'banner_{order}_{slugify(title)[:30]}.jpg', File(f), save=True)
                    except Exception:
                        pass

        self.stdout.write('  ✓ Banners')

    # ── Products ──────────────────────────────────────────────────────────────

    def _seed_products(self, categories, brands, count):
        PRODUCTS = self._product_templates(categories, brands)
        random.shuffle(PRODUCTS)
        target = min(count, len(PRODUCTS))

        created = 0
        for tpl in PRODUCTS[:target]:
            if Product.objects.filter(slug__startswith=slugify(tpl['name'])[:30]).exists():
                continue

            price_usd = Decimal(str(tpl['price_usd']))
            sale_usd  = Decimal(str(tpl.get('sale_price_usd', 0))) or None
            kes_rate  = Decimal('129.50')
            price_kes = (price_usd * kes_rate).quantize(Decimal('1'))
            sale_kes  = (sale_usd * kes_rate).quantize(Decimal('1')) if sale_usd else None

            product = Product(
                name=tpl['name'],
                brand=tpl['brand'],
                category=tpl['category'],
                description=tpl.get('description', ''),
                short_description=tpl.get('short_description', ''),
                bullet_points=tpl.get('bullet_points', []),
                price_usd=price_usd,
                sale_price_usd=sale_usd,
                price_kes=price_kes,
                sale_price_kes=sale_kes,
                is_featured=random.random() < 0.3,
                is_best_seller=random.random() < 0.25,
                is_new_arrival=random.random() < 0.35,
                is_amazon_choice=random.random() < 0.15,
                is_prime=True,
                has_coupon=random.random() < 0.2,
                coupon_text='Save 5% with code SAVE5' if random.random() < 0.2 else '',
                weight_kg=Decimal(str(round(random.uniform(0.1, 2.5), 2))),
            )
            product.save()

            # Images (attach 1–4 images)
            img_count = random.randint(1, 4)
            all_images = find_images()
            if all_images:
                chosen = random.sample(all_images, min(img_count, len(all_images)))
                for i, img_path in enumerate(chosen):
                    try:
                        with open(img_path, 'rb') as f:
                            pi = ProductImage(product=product, is_primary=(i == 0), order=i)
                            pi.image.save(f'prod_{product.id}_{i}.jpg', File(f), save=False)
                            pi.save()
                    except Exception:
                        pass

            # Variants
            for v_data in tpl.get('variants', []):
                v_price_kes = (Decimal(str(v_data.get('price_usd', price_usd))) * kes_rate).quantize(Decimal('1'))
                ProductVariant.objects.create(
                    product=product,
                    name=v_data['name'],
                    color=v_data.get('color', ''),
                    storage=v_data.get('storage', ''),
                    ram=v_data.get('ram', ''),
                    price_usd=Decimal(str(v_data.get('price_usd', price_usd))),
                    price_kes=v_price_kes,
                    stock=random.randint(5, 50),
                )

            # If no variants, set stock via a single default variant
            if not tpl.get('variants'):
                ProductVariant.objects.create(
                    product=product,
                    name='Standard',
                    price_usd=price_usd,
                    price_kes=price_kes,
                    stock=random.randint(10, 100),
                )

            # Specifications
            for order, (key, value) in enumerate(tpl.get('specs', {}).items()):
                ProductSpecification.objects.create(
                    product=product, key=key, value=value, order=order
                )

            created += 1
            self.stdout.write(f'  + {product.name}')

        self.stdout.write(self.style.SUCCESS(f'  ✓ {created} products created'))

    # ── Product Templates ─────────────────────────────────────────────────────

    def _product_templates(self, categories, brands):
        phones_cat = categories.get('Phones', categories.get('Smartphones'))
        laptops_cat = categories.get('Laptops')
        tablets_cat = categories.get('Tablets')
        accessories_cat = categories.get('Accessories')
        audio_cat = categories.get('Audio')
        watches_cat = categories.get('Smart Watches')

        samsung = brands.get('Samsung')
        apple = brands.get('Apple')
        xiaomi = brands.get('Xiaomi')
        tecno = brands.get('Tecno')
        infinix = brands.get('Infinix')
        huawei = brands.get('Huawei')
        oppo = brands.get('Oppo')
        oneplus = brands.get('OnePlus')
        nokia = brands.get('Nokia')
        lenovo = brands.get('Lenovo')
        hp = brands.get('HP')
        dell = brands.get('Dell')
        asus = brands.get('Asus')
        jbl = brands.get('JBL')
        anker = brands.get('Anker')

        return [
            # ── Samsung Phones ────────────────────────────────
            {
                'name': 'Samsung Galaxy S24 Ultra',
                'brand': samsung, 'category': phones_cat,
                'price_usd': 1199, 'sale_price_usd': 999,
                'short_description': '200MP camera, S Pen, AI features',
                'description': 'The ultimate Samsung flagship with a 200MP pro camera system, built-in S Pen, 6.8" Dynamic AMOLED 2X display, and Galaxy AI features.',
                'bullet_points': ['200MP pro camera with 100× Space Zoom', 'Built-in S Pen', '6.8" QHD+ Dynamic AMOLED 2X', 'Snapdragon 8 Gen 3', '5000mAh battery with 45W charging'],
                'specs': {'Display': '6.8" QHD+ AMOLED', 'Processor': 'Snapdragon 8 Gen 3', 'RAM': '12GB', 'Storage': '256GB / 512GB / 1TB', 'Camera': '200MP + 12MP + 10MP + 10MP', 'Battery': '5000mAh', 'OS': 'Android 14'},
                'variants': [
                    {'name': '256GB Titanium Black',  'color': 'Titanium Black',  'storage': '256GB', 'ram': '12GB', 'price_usd': 999},
                    {'name': '512GB Titanium Gray',   'color': 'Titanium Gray',   'storage': '512GB', 'ram': '12GB', 'price_usd': 1099},
                    {'name': '1TB Titanium Violet',   'color': 'Titanium Violet', 'storage': '1TB',   'ram': '12GB', 'price_usd': 1299},
                ],
            },
            {
                'name': 'Samsung Galaxy S24+',
                'brand': samsung, 'category': phones_cat,
                'price_usd': 799, 'sale_price_usd': 699,
                'short_description': 'Flagship performance, 50MP camera',
                'description': 'Samsung Galaxy S24+ with 6.7" Dynamic AMOLED, Snapdragon 8 Gen 3, 50MP triple camera and 4900mAh battery.',
                'bullet_points': ['6.7" QHD+ Dynamic AMOLED 2X', '50MP main camera', 'Snapdragon 8 Gen 3', '4900mAh, 45W fast charging', 'Galaxy AI features'],
                'specs': {'Display': '6.7" QHD+ AMOLED', 'Processor': 'Snapdragon 8 Gen 3', 'RAM': '12GB', 'Storage': '256GB / 512GB', 'Camera': '50MP + 10MP + 10MP', 'Battery': '4900mAh'},
                'variants': [
                    {'name': '256GB Onyx Black', 'color': 'Onyx Black', 'storage': '256GB', 'ram': '12GB', 'price_usd': 699},
                    {'name': '512GB Cobalt Violet', 'color': 'Cobalt Violet', 'storage': '512GB', 'ram': '12GB', 'price_usd': 799},
                ],
            },
            {
                'name': 'Samsung Galaxy A55 5G',
                'brand': samsung, 'category': phones_cat,
                'price_usd': 399,
                'short_description': 'Premium mid-range with 50MP camera',
                'description': 'Galaxy A55 5G brings flagship-level design and camera to the mid-range. 6.6" Super AMOLED, 50MP OIS camera, 5000mAh battery.',
                'bullet_points': ['6.6" Super AMOLED 120Hz', '50MP OIS main camera', '5G connectivity', '5000mAh, 25W charging', 'IP67 water resistance'],
                'specs': {'Display': '6.6" Super AMOLED', 'Processor': 'Exynos 1480', 'RAM': '8GB', 'Storage': '128GB / 256GB', 'Camera': '50MP + 12MP + 5MP', 'Battery': '5000mAh'},
                'variants': [
                    {'name': '128GB Awesome Navy', 'color': 'Awesome Navy', 'storage': '128GB', 'ram': '8GB', 'price_usd': 399},
                    {'name': '256GB Awesome Iceblue', 'color': 'Awesome Iceblue', 'storage': '256GB', 'ram': '8GB', 'price_usd': 449},
                ],
            },
            {
                'name': 'Samsung Galaxy A15 4G',
                'brand': samsung, 'category': phones_cat,
                'price_usd': 149,
                'short_description': 'Affordable Samsung with big display',
                'description': 'Entry-level Samsung Galaxy A15 with 6.5" Super AMOLED display, 50MP triple camera and 5000mAh battery at an unbeatable price.',
                'bullet_points': ['6.5" Super AMOLED 90Hz', '50MP triple camera', '5000mAh battery', '25W fast charging', 'Side fingerprint sensor'],
                'specs': {'Display': '6.5" Super AMOLED', 'Processor': 'Helio G99', 'RAM': '4GB / 6GB', 'Storage': '128GB', 'Battery': '5000mAh'},
                'variants': [
                    {'name': '4GB/128GB Black', 'color': 'Black', 'storage': '128GB', 'ram': '4GB', 'price_usd': 149},
                    {'name': '6GB/128GB Blue', 'color': 'Blue', 'storage': '128GB', 'ram': '6GB', 'price_usd': 169},
                ],
            },

            # ── Apple ─────────────────────────────────────────
            {
                'name': 'Apple iPhone 15 Pro Max',
                'brand': apple, 'category': phones_cat,
                'price_usd': 1199,
                'short_description': 'Titanium design, A17 Pro chip, 5× zoom',
                'description': 'iPhone 15 Pro Max. Forged in titanium. 48MP main camera with 5× Tetra-prism zoom. A17 Pro chip. USB 3 speeds.',
                'bullet_points': ['A17 Pro chip', 'Titanium design', '48MP main + 5× tetra-prism zoom', 'USB-C with USB 3 speeds', 'Always-On ProMotion display'],
                'specs': {'Display': '6.7" Super Retina XDR ProMotion', 'Chip': 'A17 Pro', 'Storage': '256GB / 512GB / 1TB', 'Camera': '48MP + 12MP + 12MP', 'Battery': 'Up to 29hrs video'},
                'variants': [
                    {'name': '256GB Natural Titanium', 'color': 'Natural Titanium', 'storage': '256GB', 'price_usd': 1199},
                    {'name': '512GB Black Titanium', 'color': 'Black Titanium', 'storage': '512GB', 'price_usd': 1399},
                    {'name': '1TB Blue Titanium', 'color': 'Blue Titanium', 'storage': '1TB', 'price_usd': 1599},
                ],
            },
            {
                'name': 'Apple iPhone 15',
                'brand': apple, 'category': phones_cat,
                'price_usd': 799, 'sale_price_usd': 749,
                'short_description': 'Dynamic Island, 48MP camera, USB-C',
                'description': 'iPhone 15 with Dynamic Island, 48MP main camera, A16 Bionic chip and USB-C. The biggest iPhone upgrade yet.',
                'bullet_points': ['Dynamic Island', '48MP main camera', 'A16 Bionic chip', 'USB-C connectivity', 'Super Retina XDR display'],
                'specs': {'Display': '6.1" Super Retina XDR', 'Chip': 'A16 Bionic', 'Storage': '128GB / 256GB / 512GB', 'Camera': '48MP + 12MP'},
                'variants': [
                    {'name': '128GB Black', 'color': 'Black', 'storage': '128GB', 'price_usd': 749},
                    {'name': '256GB Blue', 'color': 'Blue', 'storage': '256GB', 'price_usd': 849},
                ],
            },
            {
                'name': 'Apple iPhone 14',
                'brand': apple, 'category': phones_cat,
                'price_usd': 649, 'sale_price_usd': 549,
                'short_description': 'A15 Bionic, 12MP dual camera',
                'description': 'iPhone 14 with A15 Bionic, 12MP dual camera system, Emergency SOS via satellite and Crash Detection.',
                'bullet_points': ['A15 Bionic chip', '12MP dual camera', 'Crash Detection', 'Emergency SOS via satellite', 'All-day battery life'],
                'specs': {'Display': '6.1" Super Retina XDR', 'Chip': 'A15 Bionic', 'Storage': '128GB / 256GB / 512GB'},
                'variants': [
                    {'name': '128GB Midnight', 'color': 'Midnight', 'storage': '128GB', 'price_usd': 549},
                    {'name': '256GB Purple', 'color': 'Purple', 'storage': '256GB', 'price_usd': 649},
                ],
            },

            # ── Xiaomi ────────────────────────────────────────
            {
                'name': 'Xiaomi 14 Pro',
                'brand': xiaomi, 'category': phones_cat,
                'price_usd': 799, 'sale_price_usd': 699,
                'short_description': 'Leica camera, Snapdragon 8 Gen 3',
                'description': 'Xiaomi 14 Pro with Leica professional optical system, Snapdragon 8 Gen 3, 50MP triple Leica Summilux lens.',
                'bullet_points': ['Leica Summilux 50MP triple camera', 'Snapdragon 8 Gen 3', '6.73" LTPO AMOLED 120Hz', '4880mAh, 120W HyperCharge', 'IP68 water resistance'],
                'specs': {'Display': '6.73" LTPO AMOLED', 'Processor': 'Snapdragon 8 Gen 3', 'RAM': '12GB / 16GB', 'Storage': '256GB / 512GB'},
                'variants': [
                    {'name': '12GB/256GB Black', 'color': 'Black', 'storage': '256GB', 'ram': '12GB', 'price_usd': 699},
                    {'name': '16GB/512GB White', 'color': 'White', 'storage': '512GB', 'ram': '16GB', 'price_usd': 849},
                ],
            },
            {
                'name': 'Xiaomi Redmi Note 13 Pro',
                'brand': xiaomi, 'category': phones_cat,
                'price_usd': 299,
                'short_description': '200MP OIS camera, 120Hz AMOLED',
                'description': 'Redmi Note 13 Pro with 200MP OIS camera, 6.67" AMOLED 120Hz display and 67W turbo charging.',
                'bullet_points': ['200MP OIS main camera', '6.67" AMOLED 1.5K 120Hz', 'Snapdragon 7s Gen 2', '5100mAh battery', '67W turbo charging'],
                'specs': {'Display': '6.67" AMOLED 1.5K', 'Processor': 'Snapdragon 7s Gen 2', 'RAM': '8GB / 12GB', 'Storage': '256GB'},
                'variants': [
                    {'name': '8GB/256GB Midnight Black', 'color': 'Midnight Black', 'storage': '256GB', 'ram': '8GB', 'price_usd': 299},
                    {'name': '12GB/256GB Forest Green', 'color': 'Forest Green', 'storage': '256GB', 'ram': '12GB', 'price_usd': 349},
                ],
            },

            # ── Tecno ─────────────────────────────────────────
            {
                'name': 'Tecno Phantom V Fold 5G',
                'brand': tecno, 'category': phones_cat,
                'price_usd': 699,
                'short_description': 'Kenya\'s favourite foldable phone',
                'description': 'Tecno Phantom V Fold 5G. Africa\'s first foldable 5G smartphone. 7.85" AMOLED inner display, Dimensity 9000+.',
                'bullet_points': ['7.85" inner AMOLED display', '6.42" cover AMOLED', 'Dimensity 9000+ chipset', '5G connectivity', '5000mAh, 45W charging'],
                'specs': {'Inner Display': '7.85" AMOLED', 'Outer Display': '6.42" AMOLED', 'Processor': 'Dimensity 9000+', 'RAM': '12GB', 'Storage': '256GB'},
                'variants': [
                    {'name': '12GB/256GB Mystic Dawn', 'color': 'Mystic Dawn', 'storage': '256GB', 'ram': '12GB', 'price_usd': 699},
                ],
            },
            {
                'name': 'Tecno Spark 20 Pro+',
                'brand': tecno, 'category': phones_cat,
                'price_usd': 179,
                'short_description': 'Best budget phone in Kenya',
                'description': 'Tecno Spark 20 Pro+ with 6.78" AMOLED display, 108MP camera and 5000mAh battery. Designed for Kenya.',
                'bullet_points': ['6.78" AMOLED 120Hz', '108MP main camera', '5000mAh battery', '33W fast charging', 'Face unlock + fingerprint'],
                'specs': {'Display': '6.78" AMOLED', 'RAM': '8GB', 'Storage': '256GB', 'Battery': '5000mAh'},
                'variants': [
                    {'name': '8GB/256GB Mystery White', 'color': 'Mystery White', 'storage': '256GB', 'ram': '8GB', 'price_usd': 179},
                    {'name': '8GB/256GB Starry Black', 'color': 'Starry Black', 'storage': '256GB', 'ram': '8GB', 'price_usd': 179},
                ],
            },

            # ── Infinix ───────────────────────────────────────
            {
                'name': 'Infinix Zero 30 5G',
                'brand': infinix, 'category': phones_cat,
                'price_usd': 249,
                'short_description': '144Hz AMOLED, 108MP camera',
                'description': 'Infinix Zero 30 5G with 6.78" 144Hz curved AMOLED display and 108MP front camera. Best selfie phone in Kenya.',
                'bullet_points': ['6.78" 144Hz curved AMOLED', '108MP front camera', '64MP OIS main camera', 'Dimensity 8020 5G', '5000mAh, 68W charging'],
                'specs': {'Display': '6.78" Curved AMOLED 144Hz', 'Processor': 'Dimensity 8020', 'RAM': '8GB', 'Storage': '256GB'},
                'variants': [
                    {'name': '8GB/256GB Misty Gold', 'color': 'Misty Gold', 'storage': '256GB', 'ram': '8GB', 'price_usd': 249},
                ],
            },

            # ── Laptops ───────────────────────────────────────
            {
                'name': 'Samsung Galaxy Book4 Pro 360',
                'brand': samsung, 'category': laptops_cat,
                'price_usd': 1299, 'sale_price_usd': 1099,
                'short_description': '2-in-1 laptop, AMOLED touchscreen',
                'description': 'Samsung Galaxy Book4 Pro 360 with Intel Core Ultra 7, 16" Dynamic AMOLED 2X touch display and S Pen included.',
                'bullet_points': ['16" Dynamic AMOLED 2X 120Hz touch', 'Intel Core Ultra 7 processor', '16GB RAM, 512GB SSD', 'S Pen included', 'Galaxy AI features'],
                'specs': {'Display': '16" Dynamic AMOLED 2X 120Hz', 'Processor': 'Intel Core Ultra 7', 'RAM': '16GB LPDDR5', 'Storage': '512GB NVMe SSD', 'Battery': '76Wh, up to 22hrs'},
                'variants': [
                    {'name': 'Moonstone Gray', 'color': 'Moonstone Gray', 'price_usd': 1099},
                    {'name': 'Sapphire Blue', 'color': 'Sapphire Blue', 'price_usd': 1099},
                ],
            },
            {
                'name': 'Apple MacBook Air M3',
                'brand': apple, 'category': laptops_cat,
                'price_usd': 1099,
                'short_description': 'Apple M3 chip, 18hr battery',
                'description': 'MacBook Air with M3 chip. Supercharged by Apple Silicon with up to 18 hours of battery life and a stunning Liquid Retina display.',
                'bullet_points': ['Apple M3 chip (8-core CPU)', '13.6" Liquid Retina display', 'Up to 18 hours battery', '8GB / 16GB unified memory', 'MagSafe charging'],
                'specs': {'Display': '13.6" Liquid Retina', 'Chip': 'Apple M3', 'RAM': '8GB / 16GB', 'Storage': '256GB / 512GB / 1TB SSD', 'Battery': 'Up to 18 hours'},
                'variants': [
                    {'name': '8GB/256GB Midnight', 'color': 'Midnight', 'storage': '256GB', 'ram': '8GB', 'price_usd': 1099},
                    {'name': '16GB/512GB Starlight', 'color': 'Starlight', 'storage': '512GB', 'ram': '16GB', 'price_usd': 1499},
                ],
            },
            {
                'name': 'HP Pavilion 15 Laptop',
                'brand': hp, 'category': laptops_cat,
                'price_usd': 549, 'sale_price_usd': 449,
                'short_description': 'Everyday laptop, Intel i5, 512GB SSD',
                'description': 'HP Pavilion 15 with Intel Core i5-1335U, 15.6" FHD display, 8GB RAM and 512GB SSD. Perfect for work and study.',
                'bullet_points': ['Intel Core i5-1335U', '15.6" FHD IPS anti-glare', '8GB DDR4 RAM', '512GB SSD', 'Windows 11 Home'],
                'specs': {'Display': '15.6" FHD IPS', 'Processor': 'Intel Core i5-1335U', 'RAM': '8GB', 'Storage': '512GB SSD', 'OS': 'Windows 11 Home'},
            },
            {
                'name': 'Lenovo IdeaPad Slim 5',
                'brand': lenovo, 'category': laptops_cat,
                'price_usd': 499,
                'short_description': 'Slim design, AMD Ryzen 5, OLED option',
                'description': 'Lenovo IdeaPad Slim 5 Gen 9 with AMD Ryzen 5 7530U, slim aluminium chassis and optional 2.8K OLED display.',
                'bullet_points': ['AMD Ryzen 5 7530U', '16GB LPDDR5 RAM', '512GB SSD', 'Optional 2.8K OLED display', 'All-day battery (up to 12hrs)'],
                'specs': {'Processor': 'AMD Ryzen 5 7530U', 'RAM': '16GB', 'Storage': '512GB SSD', 'Display': '14" FHD / 2.8K OLED'},
            },
            {
                'name': 'Asus TUF Gaming F15',
                'brand': asus, 'category': laptops_cat,
                'price_usd': 799,
                'short_description': 'Gaming laptop, RTX 4060, 144Hz',
                'description': 'ASUS TUF Gaming F15 with Intel Core i7-13620H, RTX 4060 GPU and 144Hz FHD display. Built tough for serious gaming.',
                'bullet_points': ['Intel Core i7-13620H', 'NVIDIA RTX 4060 8GB', '15.6" FHD 144Hz display', '16GB DDR5 RAM', '512GB NVMe SSD'],
                'specs': {'Processor': 'Intel Core i7-13620H', 'GPU': 'NVIDIA RTX 4060 8GB', 'RAM': '16GB DDR5', 'Storage': '512GB NVMe SSD', 'Display': '15.6" FHD 144Hz'},
            },

            # ── Tablets ───────────────────────────────────────
            {
                'name': 'Samsung Galaxy Tab S9+',
                'brand': samsung, 'category': tablets_cat,
                'price_usd': 799, 'sale_price_usd': 699,
                'short_description': '12.4" AMOLED, Snapdragon 8 Gen 2',
                'description': 'Samsung Galaxy Tab S9+ with 12.4" Dynamic AMOLED 2X display, Snapdragon 8 Gen 2, S Pen included and IP68 rating.',
                'bullet_points': ['12.4" Dynamic AMOLED 2X 120Hz', 'Snapdragon 8 Gen 2', 'S Pen included', 'IP68 water resistance', '10090mAh battery'],
                'specs': {'Display': '12.4" AMOLED 120Hz', 'Processor': 'Snapdragon 8 Gen 2', 'RAM': '12GB', 'Storage': '256GB / 512GB'},
            },
            {
                'name': 'Apple iPad Air M2',
                'brand': apple, 'category': tablets_cat,
                'price_usd': 599,
                'short_description': 'Apple M2 chip, 11" Liquid Retina',
                'description': 'iPad Air with M2 chip. Supercharged for creativity and productivity with an 11" Liquid Retina display and all-day battery.',
                'bullet_points': ['Apple M2 chip', '11" Liquid Retina display', 'Apple Pencil Pro compatible', 'Magic Keyboard compatible', 'USB-C with USB 3 speeds'],
                'specs': {'Display': '11" Liquid Retina', 'Chip': 'Apple M2', 'Storage': '128GB / 256GB / 512GB / 1TB'},
                'variants': [
                    {'name': '128GB Blue', 'color': 'Blue', 'storage': '128GB', 'price_usd': 599},
                    {'name': '256GB Purple', 'color': 'Purple', 'storage': '256GB', 'price_usd': 749},
                ],
            },

            # ── Accessories ───────────────────────────────────
            {
                'name': 'Anker 65W GaN Charger',
                'brand': anker, 'category': accessories_cat,
                'price_usd': 35,
                'short_description': 'Compact 65W fast charger, 3 ports',
                'description': 'Anker 735 GaN Prime 65W charger with 3 ports (2× USB-C, 1× USB-A). Charges a MacBook or two phones simultaneously.',
                'bullet_points': ['65W total output', '2× USB-C + 1× USB-A', 'GaN Prime technology', 'Charges MacBook Air', 'Compact travel size'],
                'specs': {'Output': '65W', 'Ports': '2× USB-C, 1× USB-A', 'Technology': 'GaN Prime'},
            },
            {
                'name': 'Anker PowerCore 20000 Power Bank',
                'brand': anker, 'category': accessories_cat,
                'price_usd': 45,
                'short_description': '20000mAh, charges phones 4–5×',
                'description': 'Anker PowerCore 20000mAh power bank with USB-C and dual USB-A output. Perfect for travel in Kenya.',
                'bullet_points': ['20000mAh capacity', 'USB-C input/output', 'Dual USB-A output', 'Charges iPhone 15 ~4.6×', 'MultiProtect safety features'],
                'specs': {'Capacity': '20000mAh', 'Input': 'USB-C 20W', 'Output': 'USB-C 20W + 2× USB-A 15W'},
            },

            # ── Audio ─────────────────────────────────────────
            {
                'name': 'Samsung Galaxy Buds2 Pro',
                'brand': samsung, 'category': audio_cat,
                'price_usd': 199, 'sale_price_usd': 149,
                'short_description': 'ANC earbuds, 360 Audio',
                'description': 'Samsung Galaxy Buds2 Pro with intelligent Active Noise Cancellation, 360 Audio and IPX7 water resistance.',
                'bullet_points': ['Intelligent ANC', '360 Audio with Dolby Atmos', '5hrs + 13hrs battery', 'IPX7 water resistance', '24-bit Hi-Fi audio'],
                'specs': {'Driver': '10mm woofer + 5.5mm tweeter', 'ANC': 'Intelligent ANC', 'Battery': '5hrs earbuds + 13hrs case', 'Water Resistance': 'IPX7'},
                'variants': [
                    {'name': 'Bora Purple', 'color': 'Bora Purple', 'price_usd': 149},
                    {'name': 'Graphite', 'color': 'Graphite', 'price_usd': 149},
                    {'name': 'White', 'color': 'White', 'price_usd': 149},
                ],
            },
            {
                'name': 'JBL Tune 770NC Headphones',
                'brand': jbl, 'category': audio_cat,
                'price_usd': 99, 'sale_price_usd': 79,
                'short_description': 'Wireless ANC, 70hr battery',
                'description': 'JBL Tune 770NC with adaptive ANC, Ambient Aware, JBL Pure Bass Sound and 70 hours of battery with ANC off.',
                'bullet_points': ['Adaptive Noise Cancellation', '70hrs battery (ANC off)', 'JBL Pure Bass Sound', 'Foldable design', 'Multi-point connection'],
                'specs': {'Driver': '40mm', 'ANC': 'Adaptive ANC', 'Battery': 'Up to 70 hours', 'Connection': 'Bluetooth 5.3'},
                'variants': [
                    {'name': 'Black', 'color': 'Black', 'price_usd': 79},
                    {'name': 'Blue', 'color': 'Blue', 'price_usd': 79},
                    {'name': 'White', 'color': 'White', 'price_usd': 79},
                ],
            },
            {
                'name': 'JBL Charge 5 Bluetooth Speaker',
                'brand': jbl, 'category': audio_cat,
                'price_usd': 139, 'sale_price_usd': 119,
                'short_description': 'IP67 portable speaker, 20hrs',
                'description': 'JBL Charge 5 with powerful JBL Pro Sound, IP67 waterproof and dustproof, built-in power bank and 20 hours of playtime.',
                'bullet_points': ['IP67 waterproof & dustproof', '20 hours playtime', 'JBL Pro Sound', 'Built-in power bank', 'PartyBoost multi-speaker pairing'],
                'specs': {'Output': '30W', 'Battery': '7500mAh / 20hrs', 'Water Resistance': 'IP67', 'Bluetooth': '5.1'},
                'variants': [
                    {'name': 'Black', 'color': 'Black', 'price_usd': 119},
                    {'name': 'Blue', 'color': 'Blue', 'price_usd': 119},
                    {'name': 'Red', 'color': 'Red', 'price_usd': 119},
                ],
            },

            # ── Smart Watches ─────────────────────────────────
            {
                'name': 'Samsung Galaxy Watch 6 Classic',
                'brand': samsung, 'category': watches_cat,
                'price_usd': 349, 'sale_price_usd': 279,
                'short_description': 'Rotating bezel, health tracking',
                'description': 'Samsung Galaxy Watch 6 Classic with rotating bezel, advanced health tracking, sleep coaching and 2-day battery life.',
                'bullet_points': ['Physical rotating bezel', 'Advanced health tracking', 'Sleep coaching', '43mm / 47mm sizes', 'WearOS with Samsung One UI'],
                'specs': {'Display': '1.5" Super AMOLED', 'OS': 'WearOS 4', 'Battery': 'Up to 40hrs', 'Water Resistance': '5ATM + IP68'},
                'variants': [
                    {'name': '43mm Black', 'color': 'Black', 'size': '43mm', 'price_usd': 279},
                    {'name': '47mm Silver', 'color': 'Silver', 'size': '47mm', 'price_usd': 299},
                ],
            },
            {
                'name': 'Apple Watch Series 9',
                'brand': apple, 'category': watches_cat,
                'price_usd': 399,
                'short_description': 'S9 chip, Double Tap, Bright display',
                'description': 'Apple Watch Series 9 with S9 chip, new Double Tap gesture, brightest Apple Watch display and carbon neutral option.',
                'bullet_points': ['S9 SiP chip', 'New Double Tap gesture', '2000 nits Always-On display', 'Advanced health sensors', 'Carbon neutral case options'],
                'specs': {'Display': '41mm / 45mm Always-On Retina', 'Chip': 'S9 SiP', 'Battery': 'Up to 18 hours', 'Water Resistance': '50m'},
                'variants': [
                    {'name': '41mm Midnight', 'color': 'Midnight', 'size': '41mm', 'price_usd': 399},
                    {'name': '45mm Starlight', 'color': 'Starlight', 'size': '45mm', 'price_usd': 429},
                    {'name': '45mm Product Red', 'color': 'Product Red', 'size': '45mm', 'price_usd': 429},
                ],
            },
            {
                'name': 'Xiaomi Smart Band 8 Pro',
                'brand': xiaomi, 'category': watches_cat,
                'price_usd': 69,
                'short_description': 'AMOLED band, GPS, 14-day battery',
                'description': 'Xiaomi Smart Band 8 Pro with 1.74" AMOLED display, built-in GPS, 150+ sport modes and 14-day battery life.',
                'bullet_points': ['1.74" AMOLED always-on display', 'Built-in GPS', '150+ sport modes', '14-day battery life', 'SpO2 & heart rate monitoring'],
                'specs': {'Display': '1.74" AMOLED', 'GPS': 'Yes', 'Battery': 'Up to 14 days', 'Water Resistance': '5ATM'},
                'variants': [
                    {'name': 'Black', 'color': 'Black', 'price_usd': 69},
                    {'name': 'Gold', 'color': 'Gold', 'price_usd': 69},
                ],
            },
        ]

    # ── Superuser ─────────────────────────────────────────────────────────────

    def _seed_superuser(self):
        if not User.objects.filter(username='admin').exists():
            User.objects.create_superuser(
                username='admin',
                email='admin@phoneplace.ke',
                password='admin1234',
                first_name='Admin',
                last_name='PhonePlace',
            )
            self.stdout.write('  ✓ Superuser created → admin / admin1234')
        else:
            self.stdout.write('  · Superuser already exists')