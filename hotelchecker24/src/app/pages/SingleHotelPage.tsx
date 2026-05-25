import { useRoute } from 'wouter';
import {
  WpHead,
  WpLink,
  useWpQuery,
  useWpTitle,
  useWpContent,
  useWpExcerpt,
  useWpFeaturedImage,
  useWpCustomField,
} from '../../.forgewp/wordpress';
import {
  ChevronRight,
  MapPin,
  Star,
  ArrowLeft,
  User,
  DollarSign,
  Award,
  Globe,
  Mail,
  BookOpen,
  Calendar,
} from 'lucide-react';
import { Button } from '../../components/ui/button';

export function SingleHotelPage() {
  const [, params] = useRoute('/hotel/:id');
  const routeParam = params?.id;

  // In production, forgeWpHydration.currentPostId holds the real WP numeric ID
  const hydrationId =
    typeof window !== 'undefined'
      ? (window as any).forgeWpHydration?.currentPostId || 0
      : 0;
  const id = hydrationId || routeParam;

  // Local development mock query for single hotel
  const { posts, loading } = useWpQuery({
    postType: 'hotel',
    postsPerPage: 100,
  });

  const devPost = posts.find(
    (p) => p.id === Number(id) || p.id === Number(hydrationId),
  );
  const postAny = devPost as any;

  // Isomorphic dynamic mapping (compiles directly to WP loops in production)
  const title = useWpTitle() || devPost?.title || 'Luxushotel';
  const content =
    useWpContent() || devPost?.content || '<p>Lade Hoteldetails...</p>';
  const excerpt = useWpExcerpt() || devPost?.excerpt || '';
  const rawImage = useWpFeature
      ? (window as any).forgeWpHydration?.currentFeaturedImage || ''
      : '';
  const restImage =
    typeof devPost?.featuredImage === 'object' &&
    devPost?.featuredImage !== null
      ? (devPost.featuredImage as any).url || ''
      : String(devPost?.featuredImage || '');
  const featuredImage =
    restImage ||
    hydrationImage ||
    rawImage ||
    'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80';

  // ACF Custom Fields
  const rating =
    useWpCustomField('rating') ||
    String(devPost?.customFields?.rating || '4.8');
  const priceRange =
    useWpCustomField('price_range') ||
    String(devPost?.customFields?.price_range || '$$$');
  const address =
    useWpCustomField('location') ||
    String(devPost?.customFields?.location || '');
  const starsVal =
    useWpCustomField('stars') || String(devPost?.customFields?.stars || '5');
  const stars = parseInt(starsVal, 10) || 5;
  const city =
    useWpCustomField('city') || String(devPost?.customFields?.city || '');

  // Extended ACF coordinates
  const website =
    useWpCustomField('website') || String(devPost?.customFields?.website || '');
  const email =
    useWpCustomField('contact_email') ||
    String(devPost?.customFields?.contact_email || '');

  // Terms mapping
  const categoryTerms = postAny?._terms?.category || [];
  const categoryName =
    categoryTerms.length > 0 ? categoryTerms[0].name : 'Boutique Hotel';

  // Relational Loop: Fetch all listicles and filter to those referencing this hotel
  const { posts: allListicles, loading: listiclesLoading } = useWpQuery({