import { ExecutedProjectShowcase, MeasurementBooking, LocalDecorator } from '../types/booking'

const BOOKINGS_STORAGE_KEY = 'decome_measurement_bookings'

export const DECOME_SUPPLIER_CONTACT = {
  name: 'DECOME Certified Decoration & Fabrication Network',
  primaryPhone: '+91 98201 54321',
  secondaryPhone: '+91 98199 87654',
  whatsappUrl: 'https://wa.me/919820154321?text=Hi%20DECOME%20Team%2C%20I%20want%20to%20book%20an%20on-site%20measurement%20and%20interior%20decoration%20build.',
  email: 'fabrication@decome.com',
  workingHours: 'Mon - Sun: 9:00 AM - 8:30 PM',
  guaranteeBadge: '100% Precision Laser Measurement & Turnkey Fabrication Guarantee'
}

export const EXECUTED_PROJECTS_SHOWCASE: ExecutedProjectShowcase[] = [
  {
    id: 'exec_worli_penthouse',
    title: 'Worli Sea-Facing Minimalist Living Room',
    location: 'Worli, South Mumbai',
    style: 'Modern Scandinavian',
    budget: '₹4.8 Lakhs',
    beforeImageUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=600&auto=format&fit=crop&q=80',
    afterImageUrl: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=600&auto=format&fit=crop&q=80',
    areaSqFt: 340,
    completionDays: 14,
    description: 'Measured with millimeter 3D laser scanner, custom low-profile walnut credenza fabricated off-site and installed in 48 hours.',
    clientReview: '"From photo upload to on-site measurer visit and final build, DECOME delivered exact millimeter fit!" — Priya K.'
  },
  {
    id: 'exec_bandra_studio',
    title: 'Bandra Urban Loft & Hybrid Workspace',
    location: 'Pali Hill, Bandra West',
    style: 'Industrial Contemporary',
    budget: '₹2.9 Lakhs',
    beforeImageUrl: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=600&auto=format&fit=crop&q=80',
    afterImageUrl: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=600&auto=format&fit=crop&q=80',
    areaSqFt: 220,
    completionDays: 9,
    description: 'Transformed congested 1BHK into airy open-concept layout with space-saving foldout desk and concealed cable ducting.',
    clientReview: '"The measurement expert arrived within 24 hours of my booking request. Zero hassle." — Rohan M.'
  },
  {
    id: 'exec_powai_villa',
    title: 'Hiranandani Powai Master Bedroom & Walk-in Suite',
    location: 'Powai, Mumbai',
    style: 'Luxury Japandi',
    budget: '₹6.2 Lakhs',
    beforeImageUrl: 'https://images.unsplash.com/photo-1540518614846-7ede433c4ef4?w=600&auto=format&fit=crop&q=80',
    afterImageUrl: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=600&auto=format&fit=crop&q=80',
    areaSqFt: 410,
    completionDays: 18,
    description: 'Acoustic slatted oak wall paneling behind king platform bed, motorized blackout drape tracks, and integrated warm cove lighting.',
    clientReview: '"Exact 3D render matched the physical finished room by 99%." — Sunita & Rajesh D.'
  }
]

export const LOCAL_DECORATORS_DATABASE: LocalDecorator[] = [
  // MUMBAI
  {
    id: 'dec_mum_01',
    name: 'Vikramaditya Mehta',
    firmName: 'Aura Luxe Architectural Interiors',
    city: 'Mumbai',
    neighborhood: 'South Mumbai & Worli',
    rating: 4.9,
    reviewsCount: 142,
    projectsCount: 88,
    primaryPhone: '+91 98201 54321',
    whatsappNumber: '919820154321',
    specialties: ['Luxury Living Rooms', 'Laser 3D Measurement', 'Italian Veneers & False Ceilings', 'Turnkey Execution'],
    experienceYears: 12,
    verifiedBadge: true,
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&auto=format&fit=crop&q=80',
    pricingTier: '₹₹₹ Premium',
    address: 'Studio 402, High Street Phoenix Mills, Lower Parel, Mumbai'
  },
  {
    id: 'dec_mum_02',
    name: 'Ananya Deshmukh',
    firmName: 'Studio Zen Minimalist Decor',
    city: 'Mumbai',
    neighborhood: 'Bandra West & Khar',
    rating: 4.8,
    reviewsCount: 96,
    projectsCount: 64,
    primaryPhone: '+91 98202 88990',
    whatsappNumber: '919820288990',
    specialties: ['Japandi Minimalist Homes', 'Modular Kitchens', 'Custom Lighting Architecture'],
    experienceYears: 9,
    verifiedBadge: true,
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=160&auto=format&fit=crop&q=80',
    pricingTier: '₹₹ Mid-to-High',
    address: '14th Road, Off Linking Road, Bandra West, Mumbai'
  },
  {
    id: 'dec_mum_03',
    name: 'Rajeev Singhania',
    firmName: 'UrbanCraft Living & Modular Fabrication',
    city: 'Mumbai',
    neighborhood: 'Powai & Andheri East',
    rating: 4.9,
    reviewsCount: 118,
    projectsCount: 75,
    primaryPhone: '+91 98199 44321',
    whatsappNumber: '919819944321',
    specialties: ['Compact Space Optimization', 'Acoustic Paneling', '3D Walkthrough Laser Precision'],
    experienceYears: 14,
    verifiedBadge: true,
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=160&auto=format&fit=crop&q=80',
    pricingTier: '₹₹ Affordable Luxury',
    address: 'Central Avenue, Hiranandani Gardens, Powai, Mumbai'
  },

  // DELHI NCR
  {
    id: 'dec_del_01',
    name: 'Kabir Malhotra',
    firmName: 'Vanguard Heritage & Contemporary Design',
    city: 'Delhi NCR',
    neighborhood: 'South Delhi & Golf Course Road, Gurgaon',
    rating: 4.9,
    reviewsCount: 165,
    projectsCount: 110,
    primaryPhone: '+91 98110 76543',
    whatsappNumber: '919811076543',
    specialties: ['Penthouse Transformation', 'Imported Marble Detailing', 'Smart Home Lighting Automation'],
    experienceYears: 15,
    verifiedBadge: true,
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160&auto=format&fit=crop&q=80',
    pricingTier: '₹₹₹ Ultra Luxury',
    address: 'DLF Phase 5, Horizon Centre, Gurugram, Delhi NCR'
  },
  {
    id: 'dec_del_02',
    name: 'Meera Chawla',
    firmName: 'Elements Interior Atelier',
    city: 'Delhi NCR',
    neighborhood: 'Greater Kailash & Saket',
    rating: 4.8,
    reviewsCount: 84,
    projectsCount: 52,
    primaryPhone: '+91 98112 34567',
    whatsappNumber: '919811234567',
    specialties: ['Turnkey Modular Carpentry', 'Warm Scandinavian Palettes', 'Wardrobe Systems'],
    experienceYears: 8,
    verifiedBadge: true,
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=160&auto=format&fit=crop&q=80',
    pricingTier: '₹₹ Moderate',
    address: 'M-Block Market, Greater Kailash II, New Delhi'
  },

  // BENGALURU
  {
    id: 'dec_blr_01',
    name: 'Karthik Ramanathan',
    firmName: 'Studio Silicon Living & Tech Interiors',
    city: 'Bengaluru',
    neighborhood: 'Indiranagar & Koramangala',
    rating: 4.9,
    reviewsCount: 198,
    projectsCount: 135,
    primaryPhone: '+91 98450 12345',
    whatsappNumber: '919845012345',
    specialties: ['Ergonomic Workspaces', 'Modern Biophilic Living Rooms', 'German Hardware Fitting'],
    experienceYears: 11,
    verifiedBadge: true,
    avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=160&auto=format&fit=crop&q=80',
    pricingTier: '₹₹ Modern Premium',
    address: '100 Feet Road, HAL 2nd Stage, Indiranagar, Bengaluru'
  },
  {
    id: 'dec_blr_02',
    name: 'Shweta Hegde',
    firmName: 'Earth & Line Design Studio',
    city: 'Bengaluru',
    neighborhood: 'Whitefield & HSR Layout',
    rating: 4.8,
    reviewsCount: 112,
    projectsCount: 78,
    primaryPhone: '+91 98452 98765',
    whatsappNumber: '919845298765',
    specialties: ['Sustainable Bamboo & Teak', '3D Layout Reconfiguration', 'On-Site Laser Surveying'],
    experienceYears: 10,
    verifiedBadge: true,
    avatarUrl: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=160&auto=format&fit=crop&q=80',
    pricingTier: '₹₹ Balanced',
    address: 'Sector 4, HSR Layout, Bengaluru'
  },

  // HYDERABAD
  {
    id: 'dec_hyd_01',
    name: 'Praneeth Reddy',
    firmName: 'Deccan Royale Architectural Studio',
    city: 'Hyderabad',
    neighborhood: 'Jubilee Hills & Banjara Hills',
    rating: 4.9,
    reviewsCount: 145,
    projectsCount: 92,
    primaryPhone: '+91 98490 55432',
    whatsappNumber: '919849055432',
    specialties: ['Grand Living Ceilings', 'Full Villa Renovation', 'Italian Furniture Imports'],
    experienceYears: 13,
    verifiedBadge: true,
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=160&auto=format&fit=crop&q=80',
    pricingTier: '₹₹₹ Luxury',
    address: 'Road No. 36, Jubilee Hills, Hyderabad'
  },

  // PUNE
  {
    id: 'dec_pun_01',
    name: 'Tanvi Kulkarni',
    firmName: 'Koregaon Aesthetic Design Co.',
    city: 'Pune',
    neighborhood: 'Koregaon Park & Kalyani Nagar',
    rating: 4.9,
    reviewsCount: 92,
    projectsCount: 60,
    primaryPhone: '+91 98220 67890',
    whatsappNumber: '919822067890',
    specialties: ['Modern Boho & Japandi', 'Terrace Gardening Integration', 'Custom Wood Craft'],
    experienceYears: 9,
    verifiedBadge: true,
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=160&auto=format&fit=crop&q=80',
    pricingTier: '₹₹ High Quality',
    address: 'North Main Road, Koregaon Park, Pune'
  },

  // CHENNAI
  {
    id: 'dec_che_01',
    name: 'Suresh Vasan',
    firmName: 'Coromandel Modern Interiors',
    city: 'Chennai',
    neighborhood: 'Adyar & Boat Club Road',
    rating: 4.8,
    reviewsCount: 88,
    projectsCount: 54,
    primaryPhone: '+91 98400 33211',
    whatsappNumber: '919840033211',
    specialties: ['Tropical Modernism', 'Solid Teak Fabrication', 'Acoustic Ceilings'],
    experienceYears: 14,
    verifiedBadge: true,
    avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=160&auto=format&fit=crop&q=80',
    pricingTier: '₹₹ Premium',
    address: 'Gandhi Nagar, Adyar, Chennai'
  }
]

export const SUPPORTED_CITIES: string[] = [
  'Mumbai',
  'Delhi NCR',
  'Bengaluru',
  'Hyderabad',
  'Pune',
  'Chennai'
]

export function getLocalDecoratorsByCity(city: string): LocalDecorator[] {
  const clean = city.trim().toLowerCase()
  if (!clean) return []

  const matches = LOCAL_DECORATORS_DATABASE.filter(d => 
    d.city.toLowerCase().includes(clean) || 
    d.neighborhood.toLowerCase().includes(clean)
  )

  if (matches.length > 0) {
    return matches
  }

  // Fallback: If user enters an unlisted city, provide DECOME Central Dispatch decorator for that exact city
  return [
    {
      id: `dec_custom_${Date.now()}`,
      name: 'DECOME Certified Regional Surveyor & Decorator',
      firmName: `DECOME Turnkey Execution Studio (${city})`,
      city: city,
      neighborhood: `Citywide Service — ${city}`,
      rating: 4.9,
      reviewsCount: 85,
      projectsCount: 45,
      primaryPhone: DECOME_SUPPLIER_CONTACT.primaryPhone,
      whatsappNumber: '919820154321',
      specialties: ['Direct 3D Laser Measurement', 'Turnkey Interior Execution', 'Fixed-Price Guarantee'],
      experienceYears: 10,
      verifiedBadge: true,
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&auto=format&fit=crop&q=80',
      pricingTier: '₹₹ Direct Factory Pricing',
      address: `Certified On-Site Dispatch Hub, ${city}`
    }
  ]
}

export function createWhatsAppChatUrl(rawNumber: string, customMessage?: string): string {
  const cleanNumber = rawNumber.replace(/[^0-9]/g, '')
  if (customMessage && customMessage.trim()) {
    return `https://api.whatsapp.com/send?phone=${cleanNumber}&text=${encodeURIComponent(customMessage.trim())}`
  }
  return `https://api.whatsapp.com/send?phone=${cleanNumber}`
}

export function getStoredBookings(): MeasurementBooking[] {
  try {
    const raw = localStorage.getItem(BOOKINGS_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function createMeasurementBooking(
  bookingInput: Omit<MeasurementBooking, 'id' | 'createdAt' | 'status' | 'supplierContact'>
): MeasurementBooking {
  const newBooking: MeasurementBooking = {
    ...bookingInput,
    id: `book_meas_${Date.now()}`,
    status: 'measurer_assigned',
    createdAt: new Date().toISOString(),
    supplierContact: DECOME_SUPPLIER_CONTACT.primaryPhone
  }

  const existing = getStoredBookings()
  const updated = [newBooking, ...existing]
  try {
    localStorage.setItem(BOOKINGS_STORAGE_KEY, JSON.stringify(updated))
  } catch (err) {
    console.error('Failed to store measurement booking:', err)
  }

  return newBooking
}

