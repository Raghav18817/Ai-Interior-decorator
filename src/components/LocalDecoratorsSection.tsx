import { useState } from 'react'
import { LocalDecorator } from '../types/booking'
import { 
  getLocalDecoratorsByCity, 
  SUPPORTED_CITIES, 
  createWhatsAppChatUrl 
} from '../services/bookingService'
import { 
  MapPin, 
  Search, 
  Phone, 
  MessageCircle, 
  ShieldCheck, 
  Star, 
  Send, 
  X,
  ExternalLink,
  Sparkles,
  Building2
} from 'lucide-react'

export function LocalDecoratorsSection() {
  const [selectedCity, setSelectedCity] = useState<string>('Mumbai')
  const [searchInput, setSearchInput] = useState<string>('')
  const [activeChatDecorator, setActiveChatDecorator] = useState<LocalDecorator | null>(null)
  const [customChatMessage, setCustomChatMessage] = useState<string>(
    'Hi! I found your interior firm on DECOME and would like to discuss my home decoration and 3D design plan.'
  )

  const decorators = getLocalDecoratorsByCity(selectedCity)

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchInput.trim()) {
      setSelectedCity(searchInput.trim())
    }
  }

  const handleSelectCityChip = (city: string) => {
    setSelectedCity(city)
    setSearchInput('')
  }

  const handleLaunchWhatsApp = (decorator: LocalDecorator) => {
    const url = createWhatsAppChatUrl(decorator.whatsappNumber, customChatMessage)
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="space-y-6 pt-6 border-t border-slate-800">
      {/* SECTION HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-2">
            <MapPin className="w-3.5 h-3.5" />
            <span>Local Interior Decorators Directory</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center space-x-2">
            <span>Find Certified Home Decorators in Your Location</span>
            <Sparkles className="w-5 h-5 text-emerald-400" />
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            Filter by your city to connect with verified interior decorators, false-ceiling craftsmen, and laser surveyors. Call directly or message on WhatsApp to discuss your custom project.
          </p>
        </div>

        {/* City Quick Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {SUPPORTED_CITIES.map((city) => (
            <button
              key={city}
              onClick={() => handleSelectCityChip(city)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                selectedCity.toLowerCase() === city.toLowerCase()
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700/80'
              }`}
            >
              {city}
            </button>
          ))}
        </div>
      </div>

      {/* LOCATION SEARCH BAR */}
      <form onSubmit={handleSearchSubmit} className="relative max-w-xl">
        <MapPin className="w-4 h-4 text-emerald-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search by city, neighborhood, or PIN (e.g. Bandra, Gurgaon, Indiranagar)..."
          className="w-full pl-11 pr-24 py-3 bg-slate-900 border border-slate-700/80 rounded-2xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors shadow-inner"
        />
        <button
          type="submit"
          className="absolute right-2 top-1/2 -translate-y-1/2 px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 font-bold text-xs rounded-xl transition-all flex items-center space-x-1"
        >
          <Search className="w-3.5 h-3.5" />
          <span>Search</span>
        </button>
      </form>

      {/* ACTIVE LOCATION STATUS */}
      <div className="flex items-center space-x-2 text-xs text-slate-400 font-medium">
        <span>Showing verified decorators for:</span>
        <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold">
          {selectedCity}
        </span>
        <span>({decorators.length} verified studios available)</span>
      </div>

      {/* DECORATORS GRID */}
      {decorators.length === 0 ? (
        <div className="p-8 text-center bg-slate-900/60 rounded-3xl border border-slate-800 space-y-2">
          <Building2 className="w-8 h-8 text-slate-500 mx-auto" />
          <p className="text-sm font-semibold text-white">No local decorators found in this exact sector</p>
          <p className="text-xs text-slate-400">
            Try searching for a major metropolitan hub or contact DECOME central customer support.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {decorators.map((decorator) => (
            <div
              key={decorator.id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-3xl p-5 shadow-xl transition-all flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-3.5">
                {/* Header: Avatar, Name & Firm */}
                <div className="flex items-start space-x-3.5">
                  <img
                    src={decorator.avatarUrl}
                    alt={decorator.name}
                    className="w-13 h-13 rounded-2xl object-cover border border-slate-700 shrink-0 shadow"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-1.5">
                      <h4 className="text-sm font-bold text-white truncate group-hover:text-emerald-400 transition-colors">
                        {decorator.name}
                      </h4>
                      {decorator.verifiedBadge && (
                        <span title="DECOME Certified Decorator">
                          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 truncate">{decorator.firmName}</p>
                    <div className="flex items-center space-x-2 text-[11px] text-slate-400 mt-1">
                      <div className="flex items-center space-x-0.5 text-amber-400 font-bold">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span>{decorator.rating}</span>
                      </div>
                      <span>&bull;</span>
                      <span>{decorator.reviewsCount} reviews</span>
                      <span>&bull;</span>
                      <span className="text-emerald-400 font-semibold">{decorator.projectsCount} built</span>
                    </div>
                  </div>
                </div>

                {/* Location & Experience Details */}
                <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800/80 space-y-1.5 text-xs">
                  <div className="flex items-center space-x-1.5 text-slate-300">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="truncate">{decorator.neighborhood}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5 border-t border-slate-800">
                    <span>{decorator.experienceYears} Years Experience</span>
                    <span className="text-slate-300 font-medium">{decorator.pricingTier}</span>
                  </div>
                </div>

                {/* Specialties Chips */}
                <div className="flex flex-wrap gap-1.5">
                  {decorator.specialties.map((spec, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 bg-slate-800/90 text-slate-300 rounded-md text-[10px] font-medium"
                    >
                      {spec}
                    </span>
                  ))}
                </div>
              </div>

              {/* ACTION BUTTONS: DIRECT CALL & WHATSAPP CHAT */}
              <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row gap-2">
                {/* Call Link */}
                <a
                  href={`tel:${decorator.primaryPhone.replace(/\s+/g, '')}`}
                  className="flex-1 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 border border-slate-700"
                >
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="truncate">Call {decorator.primaryPhone}</span>
                </a>

                {/* WhatsApp Connect Button */}
                <button
                  onClick={() => {
                    setActiveChatDecorator(decorator)
                  }}
                  className="py-2.5 px-3.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 shadow-lg shadow-emerald-600/20"
                >
                  <MessageCircle className="w-4 h-4 fill-white text-white" />
                  <span>WhatsApp</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* WHATSAPP CUSTOM MESSAGE MODAL */}
      {activeChatDecorator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl space-y-5 text-slate-100 animate-in zoom-in-95">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                  <MessageCircle className="w-5 h-5 fill-emerald-400" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">
                    Message {activeChatDecorator.name}
                  </h4>
                  <p className="text-xs text-slate-400">
                    {activeChatDecorator.firmName} &bull; WhatsApp: +{activeChatDecorator.whatsappNumber}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveChatDecorator(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Custom Message Area */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">
                Type your project requirements or question to send on WhatsApp:
              </label>
              <textarea
                rows={4}
                value={customChatMessage}
                onChange={(e) => setCustomChatMessage(e.target.value)}
                placeholder="Type whatever message you want to send..."
                className="w-full p-3 bg-slate-950 border border-slate-700 rounded-2xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
              <p className="text-[11px] text-slate-400">
                Clicking &quot;Send to WhatsApp&quot; will immediately open WhatsApp Web or your mobile WhatsApp app with this decorator&apos;s chat.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setActiveChatDecorator(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  handleLaunchWhatsApp(activeChatDecorator)
                  setActiveChatDecorator(null)
                }}
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/25 transition-all flex items-center space-x-2"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Open in WhatsApp</span>
                <ExternalLink className="w-3 h-3 ml-0.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
