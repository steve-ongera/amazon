from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from . import views

router = DefaultRouter()

# Geography
router.register(r'countries', views.CountryViewSet, basename='country')
router.register(r'counties', views.CountyViewSet, basename='county')
router.register(r'pickup-stations', views.PickupStationViewSet, basename='pickup-station')

# Catalogue
router.register(r'categories', views.CategoryViewSet, basename='category')
router.register(r'brands', views.BrandViewSet, basename='brand')
router.register(r'products', views.ProductViewSet, basename='product')
router.register(r'banners', views.BannerViewSet, basename='banner')

# Commerce
router.register(r'cart', views.CartViewSet, basename='cart')
router.register(r'addresses', views.AddressViewSet, basename='address')
router.register(r'orders', views.OrderViewSet, basename='order')
router.register(r'wishlist', views.WishlistViewSet, basename='wishlist')

urlpatterns = [
    # Router URLs
    path('', include(router.urls)),

    # Homepage aggregated
    path('homepage/', views.HomepageView.as_view(), name='homepage'),

    # Auth
    path('auth/register/', views.RegisterView.as_view(), name='register'),
    path('auth/login/', views.LoginView.as_view(), name='login'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/profile/', views.ProfileView.as_view(), name='profile'),
    path('auth/change-password/', views.ChangePasswordView.as_view(), name='change_password'),

    # Payments
    path('payments/mpesa/stk-push/', views.MpesaSTKPushView.as_view(), name='mpesa_stk'),
    path('payments/mpesa/callback/', views.MpesaCallbackView.as_view(), name='mpesa_callback'),
    path('payments/mpesa/status/<uuid:order_id>/', views.MpesaStatusView.as_view(), name='mpesa_status'),
    path('payments/paypal/create/', views.PayPalCreateOrderView.as_view(), name='paypal_create'),
    path('payments/paypal/capture/', views.PayPalCaptureView.as_view(), name='paypal_capture'),

    # Utilities
    path('coupons/validate/', views.CouponValidateView.as_view(), name='coupon_validate'),
    path('recently-viewed/', views.RecentlyViewedView.as_view(), name='recently_viewed'),
    path('exchange-rates/', views.ExchangeRateView.as_view(), name='exchange_rates'),
]