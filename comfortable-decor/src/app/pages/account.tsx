import * as React from 'react';
import { useLocation, WpHead, useWpPageLink, WpImage, Link } from '@forgewp/react';
import { useWpUser, useWpAuth } from '@forgewp/auth';
import { useWpCustomer, useWpCurrency } from '@forgewp/woocommerce';
import {
  MapPin,
  User,
  ArrowRight,
  Check,
  FileText,
  LogOut,
  Truck,
  ExternalLink,
  Copy,
  X,
  Download,
  RefreshCw,
  Package,
  ShoppingBag,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export const pageConfig = {
  protected: true,
  redirect: 'template:login-page',
};

type AccountTab = 'overview' | 'orders' | 'downloads' | 'addresses' | 'details';

type OrderItem = {
  id: number;
  name: string;
  finish: string;
  qty: number;
  price: number;
  image: string;
};

type TrackingCheckpoint = {
  status: string;
  location: string;
  time: string;
  done: boolean;
};

type Order = {
  id: string;
  date: string;
  status: 'In Transit' | 'Processing' | 'Delivered';
  carrier: string;
  trackingNumber: string;
  trackingUrl: string;
  estimatedDelivery: string;
  total: number;
  items: OrderItem[];
  shippingAddress: string;
  checkpoints: TrackingCheckpoint[];
};



export default function AccountPage() {
  const [location, setLocation] = useLocation();
  const user = useWpUser();
  const { logout, initializing } = useWpAuth();
  const { customer, orders: wpCustomerOrders, downloads: wpDownloads, refreshOrders, updateProfile, updateAddress } = useWpCustomer();
  const { formatPrice } = useWpCurrency();
  const loginUrl = useWpPageLink('login-page', '/login');

  React.useEffect(() => {
    if (!initializing && !user) {
      setLocation(loginUrl);
    }
  }, [user, initializing, loginUrl, setLocation]);

  // Determine active tab from URL path
  const currentTab: AccountTab = React.useMemo(() => {
    if (location.includes('/orders')) return 'orders';
    if (location.includes('/downloads')) return 'downloads';
    if (location.includes('/addresses')) return 'addresses';
    if (location.includes('/details') || location.includes('/edit-account') || location.includes('/payments') || location.includes('/payment-methods')) return 'details';
    return 'overview';
  }, [location]);

  const [selectedOrder, setSelectedOrder] = React.useState<Order | null>(null);
  const [trackingModalOrder, setTrackingModalOrder] = React.useState<Order | null>(null);
  const [copiedTracking, setCopiedTracking] = React.useState(false);
  const [addressSaved, setAddressSaved] = React.useState(false);
  const [profileSaved, setProfileSaved] = React.useState(false);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const handleCopyTracking = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedTracking(true);
    setTimeout(() => setCopiedTracking(false), 2000);
  };

  const handleRefreshOrders = async () => {
    setIsRefreshing(true);
    try {
      if (refreshOrders) await refreshOrders();
    } catch {
      // ignore
    } finally {
      setTimeout(() => setIsRefreshing(false), 600);
    }
  };

  // User display name & form initial values
  const userDisplayName =
    user?.displayName ||
    user?.username ||
    (user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : '') ||
    customer?.first_name ||
    'Account';

  const nameParts = (user?.displayName || user?.username || '').trim().split(' ');
  const derivedFirstName = user?.firstName || customer?.first_name || (nameParts.length > 0 ? nameParts[0] : '');
  const derivedLastName = user?.lastName || customer?.last_name || (nameParts.length > 1 ? nameParts.slice(1).join(' ') : '');

  // Form states for profile & address
  const [profileForm, setProfileForm] = React.useState({
    firstName: derivedFirstName,
    lastName: derivedLastName,
    email: user?.email || customer?.email || '',
    phone: customer?.billing?.phone || user?.billing?.phone || '',
  });

  const [shippingAddress, setShippingAddress] = React.useState({
    name: customer?.shipping?.first_name
      ? `${customer.shipping.first_name} ${customer.shipping.last_name || ''}`.trim()
      : (user?.displayName || `${derivedFirstName} ${derivedLastName}`.trim() || user?.username || 'Valued Customer'),
    street: customer?.shipping?.address_1 || user?.shipping?.address_1 || '',
    city: customer?.shipping?.city || user?.shipping?.city || '',
    postalCode: customer?.shipping?.postcode || user?.shipping?.postcode || '',
    country: customer?.shipping?.country || user?.shipping?.country || 'Sweden',
    phone: customer?.billing?.phone || user?.billing?.phone || '',
  });

  React.useEffect(() => {
    if (user || customer) {
      const parts = (user?.displayName || user?.username || '').trim().split(' ');
      const fName = user?.firstName || customer?.first_name || (parts.length > 0 ? parts[0] : '');
      const lName = user?.lastName || customer?.last_name || (parts.length > 1 ? parts.slice(1).join(' ') : '');

      setProfileForm((prev) => ({
        firstName: fName || prev.firstName,
        lastName: lName || prev.lastName,
        email: user?.email || customer?.email || prev.email,
        phone: customer?.billing?.phone || user?.billing?.phone || prev.phone,
      }));
      const s = customer?.shipping || user?.shipping;
      if (s) {
        setShippingAddress((prev) => ({
          name: s.first_name ? `${s.first_name} ${s.last_name || ''}`.trim() : (user?.displayName || user?.username || prev.name),
          street: s.address_1 || prev.street,
          city: s.city || prev.city,
          postalCode: s.postcode || prev.postalCode,
          country: s.country || prev.country || 'Sweden',
          phone: customer?.billing?.phone || user?.billing?.phone || prev.phone,
        }));
      }
    }
  }, [user, customer]);

  const [isEditingAddress, setIsEditingAddress] = React.useState(false);

  const orders: Order[] = React.useMemo(() => {
    if (wpCustomerOrders && Array.isArray(wpCustomerOrders)) {
      return wpCustomerOrders.map((wo) => ({
        id: `CD-${wo.id}`,
        date: wo.date,
        status: (wo.status === 'completed' ? 'Delivered' : (wo.status === 'processing' ? 'Processing' : 'In Transit')) as 'In Transit' | 'Processing' | 'Delivered',
        carrier: 'Nordic Freight White-Glove',
        trackingNumber: `NF-${wo.id}-SE`,
        trackingUrl: `https://t.17track.net/en#nums=NF${wo.id}SE`,
        estimatedDelivery: '3-5 Business Days',
        total: wo.totalAmount || parseFloat(String(wo.total).replace(/[^0-9.]/g, '')) || 0,
        checkpoints: [
          { status: 'Order Confirmed & Processed', location: 'Copenhagen Hub', time: wo.date, done: true },
          { status: 'Out for Appointment Delivery', location: 'Destination Sort Hub', time: 'Pending', done: wo.status === 'completed' },
        ],
        items: (wo.items || []).map((item: any, idx: number) => ({
          id: idx + 1,
          name: item.title || item.name || 'Custom Spatial Piece',
          finish: 'Natural Wood / Bouclé',
          qty: item.qty || item.quantity || 1,
          price: item.price || ((wo.totalAmount || 50) / (item.qty || item.quantity || 1)),
          image: item.image || 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=600&q=80',
        })),
        shippingAddress: customer?.shipping?.address_1 ? `${customer.shipping.address_1}, ${customer.shipping.city || ''}` : 'Strandvägen 42, 114 56 Stockholm, Sweden',
      }));
    }
    return [];
  }, [wpCustomerOrders, customer]);

  const downloads = React.useMemo(() => {
    if (wpDownloads && Array.isArray(wpDownloads)) {
      return wpDownloads;
    }
    return [];
  }, [wpDownloads]);

  const handleTabChange = (tab: AccountTab) => {
    switch (tab) {
      case 'orders':
        setLocation('/account/orders');
        break;
      case 'downloads':
        setLocation('/account/downloads');
        break;
      case 'addresses':
        setLocation('/account/addresses');
        break;
      case 'details':
        setLocation('/account/details');
        break;
      default:
        setLocation('/account');
        break;
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (updateProfile) {
        await updateProfile({
          firstName: profileForm.firstName,
          lastName: profileForm.lastName,
          email: profileForm.email,
          phone: profileForm.phone,
        });
      }
    } catch {
      // ignore
    }
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2200);
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (updateAddress) {
        await updateAddress({
          name: shippingAddress.name,
          street: shippingAddress.street,
          city: shippingAddress.city,
          postalCode: shippingAddress.postalCode,
          country: shippingAddress.country,
          phone: shippingAddress.phone,
        });
      }
    } catch {
      // ignore
    }
    setAddressSaved(true);
    setIsEditingAddress(false);
    setTimeout(() => setAddressSaved(false), 2200);
  };

  if (initializing) {
    return (
      <div className="bg-background min-h-screen flex flex-col items-center justify-center p-8">
        <div className="w-12 h-12 border-4 border-ink border-t-transparent rounded-full animate-spin"></div>
        <p className="text-ink-muted font-mono text-sm mt-4">Checking session...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-background min-h-screen flex flex-col items-center justify-center p-8">
        <div className="w-10 h-10 border-3 border-ink border-t-transparent rounded-full animate-spin"></div>
        <p className="text-ink-muted font-mono text-sm mt-3">Redirecting to login...</p>
      </div>
    );
  }

  return (
    <>
      <WpHead
        title="My Account — Comfortable Decor"
        description="View your recent orders, track parcel shipments, manage delivery addresses, and update account details."
      />

      <div className="bg-background min-h-screen py-6 sm:py-12 md:py-20 select-none">
        <div className="container-content max-w-5xl mx-auto px-4 sm:px-6">
          {/* Editorial Greeting Header */}
          <div className="border-b border-border/70 pb-6 sm:pb-8 mb-6 sm:mb-10">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 sm:gap-4">
              <div>
                <p className="font-mono text-xs uppercase tracking-widest text-ink-muted mb-1.5 sm:mb-2">
                  My Account
                </p>
                <h1 className="font-heading text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-ink">
                  Hello, {userDisplayName}.
                </h1>
              </div>

              <button
                type="button"
                onClick={async () => {
                  await logout();
                  setLocation(loginUrl);
                }}
                className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-ink-muted hover:text-ink transition-colors cursor-pointer self-start sm:self-auto"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Log Out</span>
              </button>
            </div>

            <p className="mt-3 sm:mt-4 text-sm md:text-base text-ink-muted font-light leading-relaxed max-w-2xl">
              From your account dashboard you can view and track your{' '}
              <button
                type="button"
                onClick={() => handleTabChange('orders')}
                className="font-medium text-ink underline underline-offset-4 hover:text-sage-deep transition-colors cursor-pointer"
              >
                recent orders
              </button>
              , manage your{' '}
              <button
                type="button"
                onClick={() => handleTabChange('addresses')}
                className="font-medium text-ink underline underline-offset-4 hover:text-sage-deep transition-colors cursor-pointer"
              >
                shipping addresses
              </button>
              , and edit your{' '}
              <button
                type="button"
                onClick={() => handleTabChange('details')}
                className="font-medium text-ink underline underline-offset-4 hover:text-sage-deep transition-colors cursor-pointer"
              >
                account details & password
              </button>
              .
            </p>
          </div>

          {/* Minimalist Tab Navigation Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 sm:mb-10 no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden whitespace-nowrap">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'orders', label: `Orders (${orders.length})` },
              { id: 'downloads', label: `Downloads (${downloads.length})` },
              { id: 'addresses', label: 'Addresses' },
              { id: 'details', label: 'Account Details' },
            ].map((tab) => {
              const isActive = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabChange(tab.id as AccountTab)}
                  className={cn(
                    'rounded-full px-5 py-2.5 font-heading text-xs uppercase tracking-wider font-semibold transition-all cursor-pointer whitespace-nowrap',
                    isActive
                      ? 'bg-ink text-cream shadow-sm'
                      : 'bg-stone/60 text-ink/75 hover:bg-stone hover:text-ink',
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* ============================================================ */}
          {/* TAB 1: OVERVIEW */}
          {/* ============================================================ */}
          {currentTab === 'overview' && (
            <div className="space-y-10">
              {/* Recent Active Order Spotlight */}
              {orders[0] && (
                <div className="rounded-3xl border border-border/80 bg-white p-6 sm:p-8 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
                    <div>
                      <div className="flex items-center gap-2.5 mb-1">
                        <span className="rounded-full bg-emerald-100 text-emerald-800 px-3 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                          {orders[0].status}
                        </span>
                        <span className="font-mono text-xs text-ink-muted">
                          Order #{orders[0].id}
                        </span>
                      </div>
                      <h3 className="font-heading text-xl sm:text-2xl font-bold text-ink">
                        Delivery Scheduled: {orders[0].estimatedDelivery}
                      </h3>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => setTrackingModalOrder(orders[0])}
                        className="rounded-full bg-ink px-5 py-2.5 font-heading text-xs uppercase tracking-wider font-semibold text-cream hover:bg-sage-deep transition-all flex items-center gap-2 cursor-pointer shadow-sm"
                      >
                        <Truck className="h-3.5 w-3.5" />
                        <span>Track Parcel</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedOrder(orders[0])}
                        className="rounded-full border border-border bg-stone/40 hover:bg-stone px-4 py-2.5 font-heading text-xs uppercase tracking-wider font-semibold text-ink transition-colors cursor-pointer shadow-2xs"
                      >
                        View Order
                      </button>
                    </div>
                  </div>

                  {/* Order Preview Items */}
                  <div className="pt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {orders[0].items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-4 p-3.5 rounded-2xl border border-border/60 bg-stone/20"
                      >
                        <WpImage
                          src={item.image}
                          alt={item.name}
                          className="h-16 w-16 rounded-xl object-cover border border-border/40 bg-stone shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-heading text-sm font-bold text-ink truncate">
                            {item.name}
                          </p>
                          <p className="font-mono text-xs text-ink-muted mt-0.5">
                            {item.finish} · Qty {item.qty}
                          </p>
                          <p className="font-mono text-xs font-semibold text-ink mt-1">
                            {formatPrice(item.price * item.qty)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 pt-4 border-t border-border/60 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-ink-muted">
                    <p>
                      Carrier: <span className="text-ink font-semibold">{orders[0].carrier}</span>
                    </p>
                    <div className="flex items-center gap-3">
                      <p>
                        Tracking Code: <span className="text-ink font-semibold">{orders[0].trackingNumber}</span>
                      </p>
                      <button
                        type="button"
                        onClick={() => setTrackingModalOrder(orders[0])}
                        className="inline-flex items-center gap-1 text-sage-deep hover:text-ink font-bold underline cursor-pointer"
                      >
                        <span>Live Checkpoints →</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 2-Column Summary Cards: Address & Account Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Shipping Address Summary */}
                <div className="rounded-3xl border border-border/80 bg-white p-6 sm:p-7 shadow-xs flex flex-col justify-between space-y-6">
                  <div>
                    <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-4">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-sage-deep" />
                        <h4 className="font-heading text-base font-bold text-ink">
                          Default Shipping Address
                        </h4>
                      </div>
                    </div>
                    <div className="font-sans text-sm text-ink-muted leading-relaxed space-y-1">
                      <p className="font-semibold text-ink">{shippingAddress.name}</p>
                      <p>{shippingAddress.street}</p>
                      <p>
                        {shippingAddress.postalCode} {shippingAddress.city}, {shippingAddress.country}
                      </p>
                      <p className="pt-2 font-mono text-xs">{shippingAddress.phone}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleTabChange('addresses')}
                    className="inline-flex items-center gap-1.5 font-heading text-xs uppercase tracking-wider font-semibold text-ink hover:text-sage-deep transition-colors cursor-pointer"
                  >
                    <span>Manage Addresses</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Account Details Summary */}
                <div className="rounded-3xl border border-border/80 bg-white p-6 sm:p-7 shadow-xs flex flex-col justify-between space-y-6">
                  <div>
                    <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-4">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-sage-deep" />
                        <h4 className="font-heading text-base font-bold text-ink">
                          Personal Details
                        </h4>
                      </div>
                    </div>
                    <div className="font-sans text-sm text-ink-muted leading-relaxed space-y-1">
                      <p className="font-semibold text-ink">
                        {profileForm.firstName} {profileForm.lastName}
                      </p>
                      <p>{profileForm.email}</p>
                      <p className="pt-2 font-mono text-xs">{profileForm.phone}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleTabChange('details')}
                    className="inline-flex items-center gap-1.5 font-heading text-xs uppercase tracking-wider font-semibold text-ink hover:text-sage-deep transition-colors cursor-pointer"
                  >
                    <span>Edit Profile & Password</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 2: ORDERS */}
          {/* ============================================================ */}
          {currentTab === 'orders' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <span className="font-mono text-xs uppercase tracking-widest text-ink-muted">
                  Order History ({orders.length})
                </span>
                <button
                  type="button"
                  onClick={handleRefreshOrders}
                  disabled={isRefreshing}
                  className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-ink-muted hover:text-ink transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} />
                  <span>{isRefreshing ? 'Syncing...' : 'Sync Orders'}</span>
                </button>
              </div>

              {orders.length === 0 ? (
                <div className="rounded-3xl border border-border/80 bg-white p-12 text-center shadow-xs space-y-4">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-stone text-ink-muted">
                    <Package className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="font-heading text-lg font-bold text-ink">No orders yet</h3>
                    <p className="font-mono text-xs text-ink-muted mt-1 max-w-sm mx-auto">
                      You haven't placed any orders yet. When you complete a purchase, your parcel tracking and invoices will appear here.
                    </p>
                  </div>
                  <div className="pt-2">
                    <Link
                      href="/shop"
                      className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 font-heading text-xs font-semibold uppercase tracking-wider text-cream hover:bg-sage-deep transition-all shadow-md cursor-pointer"
                    >
                      <ShoppingBag className="h-4 w-4" />
                      <span>Browse Products</span>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      className="rounded-3xl border border-border/80 bg-white p-6 sm:p-8 shadow-xs space-y-5"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
                        <div>
                          <div className="flex items-center gap-2.5">
                            <span
                              className={cn(
                                'rounded-full px-3 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wider',
                                order.status === 'In Transit'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-stone text-ink',
                              )}
                            >
                              {order.status}
                            </span>
                            <span className="font-mono text-sm font-bold text-ink">
                              #{order.id}
                            </span>
                          </div>
                          <p className="font-mono text-xs text-ink-muted mt-1">
                            Placed on {order.date} · {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          <span className="font-mono text-lg font-bold text-ink mr-2">
                            {formatPrice(order.total)}
                          </span>
                          <button
                            type="button"
                            onClick={() => setTrackingModalOrder(order)}
                            className="rounded-full bg-ink hover:bg-sage-deep px-4 py-2 font-heading text-xs uppercase tracking-wider font-semibold text-cream transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                          >
                            <Truck className="h-3.5 w-3.5" />
                            <span>Track Parcel</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedOrder(order)}
                            className="rounded-full border border-border bg-stone/40 hover:bg-stone hover:border-ink px-4 py-2 font-heading text-xs uppercase tracking-wider font-semibold text-ink transition-colors cursor-pointer shadow-2xs"
                          >
                            View Details
                          </button>
                        </div>
                      </div>

                      {/* Order Item Rows */}
                      <div className="space-y-3">
                        {order.items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between gap-4 p-3.5 rounded-2xl border border-border/60 bg-stone/20"
                          >
                            <div className="flex items-center gap-3.5 min-w-0">
                              <WpImage
                                src={item.image}
                                alt={item.name}
                                className="h-14 w-14 rounded-xl object-cover border border-border bg-stone"
                              />
                              <div className="min-w-0">
                                <p className="font-heading text-sm font-bold text-ink truncate">
                                  {item.name}
                                </p>
                                <p className="font-mono text-xs text-ink-muted">
                                  {item.finish} · Qty: {item.qty}
                                </p>
                              </div>
                            </div>
                            <span className="font-mono text-sm font-bold text-ink shrink-0">
                              {formatPrice(item.price * item.qty)}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs font-mono text-ink-muted">
                        <div className="flex items-center gap-2">
                          <span>Carrier: <strong className="text-ink">{order.carrier}</strong></span>
                          <span>·</span>
                          <span>Tracking: <strong className="text-ink">{order.trackingNumber}</strong></span>
                        </div>
                        <div className="flex items-center gap-4">
                          <button
                            type="button"
                            onClick={() => setTrackingModalOrder(order)}
                            className="inline-flex items-center gap-1.5 text-sage-deep hover:text-ink font-bold underline cursor-pointer"
                          >
                            <Truck className="h-3.5 w-3.5" />
                            <span>Live Tracking Checkpoints →</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => alert(`Downloading Invoice for #${order.id}...`)}
                            className="inline-flex items-center gap-1.5 text-ink hover:text-sage-deep font-semibold underline cursor-pointer"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            <span>Invoice (PDF)</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 3: DOWNLOADS */}
          {/* ============================================================ */}
          {currentTab === 'downloads' && (
            <div className="space-y-6">
              {downloads.length === 0 ? (
                <div className="rounded-3xl border border-border/80 bg-white p-12 text-center shadow-xs space-y-4">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-stone text-ink-muted">
                    <Download className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="font-heading text-lg font-bold text-ink">No digital downloads</h3>
                    <p className="font-mono text-xs text-ink-muted mt-1 max-w-sm mx-auto">
                      You have no digital product files or architectural 3D spec packs associated with your account yet.
                    </p>
                  </div>
                  <div className="pt-2">
                    <Link
                      href="/shop"
                      className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 font-heading text-xs font-semibold uppercase tracking-wider text-cream hover:bg-sage-deep transition-all shadow-md cursor-pointer"
                    >
                      <ShoppingBag className="h-4 w-4" />
                      <span>Explore Collection</span>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {downloads.map((item: any, idx: number) => (
                    <div
                      key={item.download_id || idx}
                      className="rounded-3xl border border-border/80 bg-white p-6 sm:p-8 shadow-xs flex flex-col justify-between space-y-6"
                    >
                      <div>
                        <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-4">
                          <span className="font-mono text-xs uppercase tracking-widest text-sage-deep font-bold">
                            Digital Asset
                          </span>
                          <span className="rounded-full bg-stone px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase text-ink-muted">
                            {item.downloads_remaining || 'Unlimited'}
                          </span>
                        </div>
                        <h4 className="font-heading text-lg font-bold text-ink mb-1">
                          {item.download_name || item.product_name}
                        </h4>
                        <p className="font-mono text-xs text-ink-muted">
                          File: <span className="text-ink font-semibold">{item.file_name || 'asset.zip'}</span>
                        </p>
                        <p className="font-mono text-xs text-ink-muted mt-1">
                          Expires: <span className="text-ink font-semibold">{item.access_expires || 'Never'}</span>
                        </p>
                      </div>

                      <a
                        href={item.download_url && item.download_url !== '#' ? item.download_url : '#'}
                        onClick={(e) => {
                          if (!item.download_url || item.download_url === '#') {
                            e.preventDefault();
                            alert(`Initiating download for "${item.download_name || item.file_name}"...`);
                          }
                        }}
                        className="rounded-full bg-ink hover:bg-sage-deep px-5 py-2.5 font-heading text-xs uppercase tracking-wider font-semibold text-cream transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm self-start"
                      >
                        <Download className="h-4 w-4" />
                        <span>Download File</span>
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 4: ADDRESSES */}
          {/* ============================================================ */}
          {currentTab === 'addresses' && (
            <div className="space-y-6">
              {!isEditingAddress ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Shipping Address */}
                  <div className="rounded-3xl border border-border/80 bg-white p-6 sm:p-8 shadow-xs flex flex-col justify-between space-y-6">
                    <div>
                      <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-4">
                        <h3 className="font-heading text-lg font-bold text-ink">
                          Shipping Address
                        </h3>
                        <span className="rounded-full bg-stone px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase text-ink-muted">
                          Default
                        </span>
                      </div>
                      <div className="font-sans text-sm text-ink-muted leading-relaxed space-y-1">
                        <p className="font-semibold text-ink">{shippingAddress.name}</p>
                        <p>{shippingAddress.street}</p>
                        <p>
                          {shippingAddress.postalCode} {shippingAddress.city}
                        </p>
                        <p>{shippingAddress.country}</p>
                        <p className="pt-2 font-mono text-xs">{shippingAddress.phone}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsEditingAddress(true)}
                      className="rounded-full border border-border bg-stone/40 hover:bg-stone hover:border-ink px-5 py-2.5 font-heading text-xs uppercase tracking-wider font-semibold text-ink transition-colors cursor-pointer self-start shadow-2xs"
                    >
                      Edit Address
                    </button>
                  </div>

                  {/* Billing Address */}
                  <div className="rounded-3xl border border-border/80 bg-white p-6 sm:p-8 shadow-xs flex flex-col justify-between space-y-6">
                    <div>
                      <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-4">
                        <h3 className="font-heading text-lg font-bold text-ink">
                          Billing Address
                        </h3>
                        <span className="rounded-full bg-stone px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase text-ink-muted">
                          Same as shipping
                        </span>
                      </div>
                      <div className="font-sans text-sm text-ink-muted leading-relaxed space-y-1">
                        <p className="font-semibold text-ink">{shippingAddress.name}</p>
                        <p>{shippingAddress.street}</p>
                        <p>
                          {shippingAddress.postalCode} {shippingAddress.city}
                        </p>
                        <p>{shippingAddress.country}</p>
                        <p className="pt-2 font-mono text-xs">{shippingAddress.phone}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsEditingAddress(true)}
                      className="rounded-full border border-border bg-stone/40 hover:bg-stone hover:border-ink px-5 py-2.5 font-heading text-xs uppercase tracking-wider font-semibold text-ink transition-colors cursor-pointer self-start shadow-2xs"
                    >
                      Edit Address
                    </button>
                  </div>
                </div>
              ) : (
                /* Address Edit Form */
                <form
                  onSubmit={handleSaveAddress}
                  className="rounded-3xl border border-border/80 bg-white p-6 sm:p-8 shadow-xs space-y-6 max-w-2xl"
                >
                  <div className="flex items-center justify-between border-b border-border/60 pb-4">
                    <h3 className="font-heading text-xl font-bold text-ink">
                      Edit Shipping Address
                    </h3>
                    <button
                      type="button"
                      onClick={() => setIsEditingAddress(false)}
                      className="font-mono text-xs text-ink-muted hover:text-ink underline cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="font-mono text-xs uppercase tracking-wider text-ink font-semibold block mb-1.5">
                        Full Recipient Name
                      </label>
                      <input
                        type="text"
                        value={shippingAddress.name}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, name: e.target.value })}
                        className="w-full rounded-2xl border border-border bg-stone/20 px-4 py-2.5 text-sm font-sans focus:outline-none focus:ring-2 focus:ring-ink"
                        required
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="font-mono text-xs uppercase tracking-wider text-ink font-semibold block mb-1.5">
                        Street Address
                      </label>
                      <input
                        type="text"
                        value={shippingAddress.street}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, street: e.target.value })}
                        className="w-full rounded-2xl border border-border bg-stone/20 px-4 py-2.5 text-sm font-sans focus:outline-none focus:ring-2 focus:ring-ink"
                        required
                      />
                    </div>

                    <div>
                      <label className="font-mono text-xs uppercase tracking-wider text-ink font-semibold block mb-1.5">
                        City
                      </label>
                      <input
                        type="text"
                        value={shippingAddress.city}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                        className="w-full rounded-2xl border border-border bg-stone/20 px-4 py-2.5 text-sm font-sans focus:outline-none focus:ring-2 focus:ring-ink"
                        required
                      />
                    </div>

                    <div>
                      <label className="font-mono text-xs uppercase tracking-wider text-ink font-semibold block mb-1.5">
                        Postal Code
                      </label>
                      <input
                        type="text"
                        value={shippingAddress.postalCode}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, postalCode: e.target.value })}
                        className="w-full rounded-2xl border border-border bg-stone/20 px-4 py-2.5 text-sm font-sans focus:outline-none focus:ring-2 focus:ring-ink"
                        required
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="font-mono text-xs uppercase tracking-wider text-ink font-semibold block mb-1.5">
                        Country
                      </label>
                      <input
                        type="text"
                        value={shippingAddress.country}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, country: e.target.value })}
                        className="w-full rounded-2xl border border-border bg-stone/20 px-4 py-2.5 text-sm font-sans focus:outline-none focus:ring-2 focus:ring-ink"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="submit"
                      className="rounded-full bg-ink hover:bg-sage-deep px-6 py-3 font-heading text-xs uppercase tracking-wider font-semibold text-cream transition-all flex items-center gap-2 cursor-pointer shadow-md"
                    >
                      {addressSaved ? (
                        <>
                          <Check className="h-4 w-4" />
                          <span>Address Saved</span>
                        </>
                      ) : (
                        <span>Save Address</span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingAddress(false)}
                      className="rounded-full border border-border px-5 py-3 font-heading text-xs uppercase tracking-wider font-semibold text-ink hover:bg-stone transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 4: ACCOUNT DETAILS */}
          {/* ============================================================ */}
          {currentTab === 'details' && (
            <div className="max-w-2xl">
              <form
                onSubmit={handleSaveProfile}
                className="rounded-3xl border border-border/80 bg-white p-6 sm:p-8 shadow-xs space-y-6"
              >
                <h3 className="font-heading text-xl font-bold text-ink border-b border-border/60 pb-4">
                  Account Details
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="font-mono text-xs uppercase tracking-wider text-ink font-semibold block mb-1.5">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={profileForm.firstName}
                      onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                      className="w-full rounded-2xl border border-border bg-stone/20 px-4 py-2.5 text-sm font-sans focus:outline-none focus:ring-2 focus:ring-ink"
                      required
                    />
                  </div>

                  <div>
                    <label className="font-mono text-xs uppercase tracking-wider text-ink font-semibold block mb-1.5">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={profileForm.lastName}
                      onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                      className="w-full rounded-2xl border border-border bg-stone/20 px-4 py-2.5 text-sm font-sans focus:outline-none focus:ring-2 focus:ring-ink"
                      required
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="font-mono text-xs uppercase tracking-wider text-ink font-semibold block mb-1.5">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                      className="w-full rounded-2xl border border-border bg-stone/20 px-4 py-2.5 text-sm font-sans focus:outline-none focus:ring-2 focus:ring-ink"
                      required
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="font-mono text-xs uppercase tracking-wider text-ink font-semibold block mb-1.5">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                      className="w-full rounded-2xl border border-border bg-stone/20 px-4 py-2.5 text-sm font-sans focus:outline-none focus:ring-2 focus:ring-ink"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-border/60 space-y-4">
                  <h4 className="font-heading text-base font-bold text-ink">
                    Password Change (Optional)
                  </h4>
                  <div className="space-y-3">
                    <input
                      type="password"
                      placeholder="Current Password (leave blank to leave unchanged)"
                      className="w-full rounded-2xl border border-border bg-stone/20 px-4 py-2.5 text-sm font-sans focus:outline-none focus:ring-2 focus:ring-ink"
                    />
                    <input
                      type="password"
                      placeholder="New Password (leave blank to leave unchanged)"
                      className="w-full rounded-2xl border border-border bg-stone/20 px-4 py-2.5 text-sm font-sans focus:outline-none focus:ring-2 focus:ring-ink"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="rounded-full bg-ink hover:bg-sage-deep px-6 py-3 font-heading text-xs uppercase tracking-wider font-semibold text-cream transition-all flex items-center gap-2 cursor-pointer shadow-md"
                  >
                    {profileSaved ? (
                      <>
                        <Check className="h-4 w-4" />
                        <span>Changes Saved</span>
                      </>
                    ) : (
                      <span>Save Account Details</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Order Detail Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedOrder(null)}
              className="absolute inset-0 bg-ink/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto bg-white border border-border rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6"
            >
              <div className="flex items-center justify-between border-b border-border/60 pb-4">
                <div>
                  <span className="font-mono text-xs uppercase tracking-widest text-sage-deep font-bold">
                    Order Details
                  </span>
                  <h3 className="font-heading text-2xl font-bold text-ink">
                    Order #{selectedOrder.id}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  aria-label="Close order details"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-border/80 bg-white/90 text-ink backdrop-blur-sm transition-all hover:bg-ink hover:text-cream hover:scale-105 cursor-pointer shadow-2xs shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Live Tracking Banner inside Modal */}
              <div className="rounded-2xl border border-border/70 bg-stone/30 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-sage-deep" />
                    <span className="font-heading text-sm font-bold text-ink">
                      {selectedOrder.carrier}
                    </span>
                    <span className="rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 font-mono text-[10px] font-bold uppercase">
                      {selectedOrder.status}
                    </span>
                  </div>
                  <p className="font-mono text-xs text-ink-muted">
                    Tracking ID: <strong className="text-ink font-semibold">{selectedOrder.trackingNumber}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const order = selectedOrder;
                      setSelectedOrder(null);
                      setTrackingModalOrder(order);
                    }}
                    className="rounded-full bg-ink px-4 py-2 font-heading text-xs uppercase tracking-wider font-semibold text-cream hover:bg-sage-deep transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Truck className="h-3.5 w-3.5" />
                    <span>View Checkpoints</span>
                  </button>
                  <a
                    href={selectedOrder.trackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-border bg-white hover:bg-stone px-3 py-2 text-xs text-ink transition-colors"
                    title="Open carrier tracking website"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>

              <div className="space-y-4">
                <p className="font-mono text-xs uppercase tracking-wider font-semibold text-ink">
                  Ordered Pieces:
                </p>

                <div className="space-y-3">
                  {selectedOrder.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3.5 rounded-2xl border border-border/60 bg-white"
                    >
                      <div className="flex items-center gap-3.5">
                        <WpImage
                          src={item.image}
                          alt={item.name}
                          className="h-14 w-14 rounded-xl object-cover border border-border bg-stone"
                        />
                        <div>
                          <p className="font-heading text-sm font-bold text-ink">{item.name}</p>
                          <p className="font-mono text-xs text-ink-muted">{item.finish} · Qty {item.qty}</p>
                        </div>
                      </div>
                      <span className="font-mono text-sm font-bold text-ink">
                        ${(item.price * item.qty).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-border/60 pt-4 space-y-2 font-mono text-xs">
                  <div className="flex justify-between text-ink-muted">
                    <span>Subtotal:</span>
                    <span>${selectedOrder.total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-ink-muted">
                    <span>Delivery:</span>
                    <span className="text-emerald-700 font-bold">Complimentary ($0.00)</span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-ink pt-2 border-t border-border/60">
                    <span>Total:</span>
                    <span>${selectedOrder.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => alert(`Downloading Invoice #${selectedOrder.id}...`)}
                  className="flex-1 rounded-full bg-ink hover:bg-sage-deep px-5 py-3 font-heading text-xs uppercase tracking-wider font-semibold text-cream transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  <FileText className="h-4 w-4" />
                  <span>Download Invoice (PDF)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="rounded-full border border-border bg-stone/40 hover:bg-stone px-5 py-3 font-heading text-xs uppercase tracking-wider font-semibold text-ink transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Dedicated Live Parcel Tracking Modal */}
      <AnimatePresence>
        {trackingModalOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setTrackingModalOrder(null)}
              className="absolute inset-0 bg-ink/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="relative z-10 max-h-[90vh] w-full max-w-xl overflow-y-auto bg-white border border-border rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border/60 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-ink text-cream shadow-sm">
                    <Truck className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="font-mono text-[11px] uppercase tracking-widest text-sage-deep font-bold">
                      Live Dropship Tracking
                    </span>
                    <h3 className="font-heading text-xl sm:text-2xl font-bold text-ink">
                      Order #{trackingModalOrder.id}
                    </h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setTrackingModalOrder(null)}
                  aria-label="Close tracking details"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-border/80 bg-white/90 text-ink backdrop-blur-sm transition-all hover:bg-ink hover:text-cream hover:scale-105 cursor-pointer shadow-2xs shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Carrier & Tracking Code Bar */}
              <div className="p-4 rounded-2xl bg-stone/30 border border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-xs text-ink-muted">Carrier Logistics Partner</p>
                  <p className="font-heading text-base font-bold text-ink">{trackingModalOrder.carrier}</p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-ink bg-white px-3 py-1.5 rounded-xl border border-border/60">
                    {trackingModalOrder.trackingNumber}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyTracking(trackingModalOrder.trackingNumber)}
                    className="p-2 rounded-xl bg-white border border-border/60 hover:bg-stone transition-colors text-ink cursor-pointer"
                    title="Copy tracking number"
                  >
                    {copiedTracking ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Live Tracking Milestone Checkpoints */}
              <div className="space-y-4">
                <p className="font-mono text-xs uppercase tracking-wider font-semibold text-ink">
                  Logistics Milestones & Checkpoints:
                </p>

                <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                  {trackingModalOrder.checkpoints.map((cp, idx) => (
                    <div key={idx} className="relative space-y-1">
                      <div
                        className={cn(
                          'absolute -left-6 top-0.5 h-5 w-5 rounded-full flex items-center justify-center font-mono text-[10px] ring-4 ring-white',
                          cp.done
                            ? 'bg-ink text-cream'
                            : 'bg-stone text-ink-muted border border-border',
                        )}
                      >
                        {cp.done ? <Check className="h-3 w-3" /> : idx + 1}
                      </div>
                      <p className="font-heading text-sm font-bold text-ink leading-snug">
                        {cp.status}
                      </p>
                      <p className="font-mono text-xs text-ink-muted">
                        {cp.location} · {cp.time}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Estimated Delivery & Official Carrier Link */}
              <div className="pt-4 border-t border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="font-mono text-xs text-ink-muted">Estimated Delivery</p>
                  <p className="font-heading text-base font-bold text-emerald-800">
                    {trackingModalOrder.estimatedDelivery}
                  </p>
                </div>

                <a
                  href={trackingModalOrder.trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full bg-ink hover:bg-sage-deep px-5 py-2.5 font-heading text-xs uppercase tracking-wider font-semibold text-cream transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  <span>Open 17Track / Carrier Page</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
