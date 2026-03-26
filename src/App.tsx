import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type } from '@google/genai';
import Markdown from 'react-markdown';
import { 
  Bell, Search, MapPin, Compass, Upload, Camera, 
  ChevronRight, Clock, Bookmark, Heart, CreditCard, 
  Settings, Home, Map, Sparkles, Cloud, User,
  ChevronLeft, Send, CloudRain, Edit2, Navigation, Sun, CloudLightning, CloudSnow,
  MessageSquare, X, Info, Share2, Copy, Check, Instagram, Twitter, Facebook, Link,
  Play, Video, Download, Loader2
} from 'lucide-react';

import { getRealWeather, getWeatherAdaptedItinerary, withRetry } from './services/geminiService';
// Add Itinerary types
export interface ItineraryItem {
  time: string;
  title: string;
  desc: string;
  tip: string;
  img: string;
}

export interface Itinerary {
  country: string;
  title: string;
  subtitle: string;
  description: string;
  items: ItineraryItem[];
}

type Tab = 'home' | 'trip' | 'surprise' | 'message' | 'profile';

const SVLogo = ({ className = "w-full h-full" }: { className?: string }) => (
  <div className={className}>
    <svg viewBox="0 0 100 110" fill="none" stroke="#D91A32" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <circle cx="50" cy="40.65" r="8" />
      <path d="M 32.32 58.33 A 25 25 0 1 1 67.68 58.33" />
      <path d="M 67.68 58.33 L 35 91 L 25 81 A 7.07 7.07 0 0 1 35 71 L 41 77" />
      <path d="M 32.32 58.33 L 45 71" />
      <path d="M 55 81 L 65 91 L 75 81 A 7.07 7.07 0 0 0 65 71 L 59 77" />
    </svg>
  </div>
);

const Header = ({ title, leftIcon, rightIcon, onUserClick }: { title?: string, leftIcon?: React.ReactNode, rightIcon?: React.ReactNode, onUserClick?: () => void }) => (
  <div className="flex items-center justify-between px-6 py-4 bg-paper sticky top-0 z-40">
    <div className="w-6 flex justify-center">{leftIcon}</div>
    {title && <h1 className="text-accent font-serif text-xl font-bold tracking-widest uppercase">{title}</h1>}
    <div className="w-6 flex justify-center">
      {rightIcon || (
        <button onClick={onUserClick} className="focus:outline-none">
          <User className="w-5 h-5 text-ink" />
        </button>
      )}
    </div>
  </div>
);

const BottomNav = ({ currentTab, onNavigate }: { currentTab: Tab, onNavigate: (tab: Tab) => void }) => {
  const navItems = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'trip', icon: Map, label: 'Trip' },
    { id: 'surprise', icon: Sparkles, label: 'HUNT' },
    { id: 'message', icon: MessageSquare, label: 'Message' },
    { id: 'profile', icon: User, label: 'Profile' }
  ] as const;

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-ink/5 px-6 py-3 flex justify-between items-center z-50 pb-safe">
      {navItems.map(({ id, icon: Icon, label }) => {
        const isActive = currentTab === id;
        if (id === 'surprise') {
          return (
            <button 
              key={id} 
              onClick={() => onNavigate(id)} 
              className={`flex flex-col items-center gap-1 w-20 ${isActive ? 'text-accent' : 'text-accent/70 hover:text-accent'}`}
            >
              <div className={`flex items-center justify-center ${isActive ? 'scale-150' : 'scale-125'} transition-transform`}>
                <span className="text-3xl leading-none">🏹</span>
              </div>
              <span className="text-xs font-bold tracking-wider mt-1">{label}</span>
            </button>
          );
        }
        return (
          <button 
            key={id} 
            onClick={() => onNavigate(id)} 
            className={`flex flex-col items-center gap-1 w-16 ${isActive ? 'text-accent' : 'text-ink/40 hover:text-ink/60'}`}
          >
            <Icon className={`w-6 h-6 ${isActive ? 'fill-current' : ''}`} strokeWidth={isActive ? 2 : 1.5} />
            <span className="text-[10px] font-medium">{label}</span>
          </button>
        );
      })}
    </div>
  );
};

const LoadingOverlay = ({ isVisible }: { isVisible: boolean }) => (
  <AnimatePresence>
    {isVisible && (
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-[#F9F8F6] flex flex-col items-center justify-center p-6 overflow-hidden"
      >
        <div className="relative w-56 h-56 flex items-center justify-center mb-12">
          {/* Outer rotating ring - matching the image's dark red border */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 border-[3px] border-accent border-t-transparent border-b-transparent rounded-full opacity-80"
          />
          {/* Inner circle - matching the image's light pinkish background */}
          <div className="w-48 h-48 bg-[#EFE5E1] rounded-full flex items-center justify-center shadow-inner">
            <motion.div
              animate={{ 
                scale: [1, 1.1, 1],
                opacity: [0.8, 1, 0.8],
                rotate: [0, 5, -5, 0]
              }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="flex items-center justify-center"
            >
              <div className="relative">
                <Sparkles className="w-20 h-20 text-[#D4AF37]" fill="#D4AF37" />
              </div>
            </motion.div>
          </div>
        </div>
        <h2 className="text-4xl font-serif text-ink mb-4 text-center leading-tight">
          Customizing your<br/>stylish journey...
        </h2>
        <p className="text-sm text-ink/60 text-center max-w-[280px] leading-relaxed">
          AI is analyzing your aesthetic preferences and matching them with hidden gems.
        </p>
      </motion.div>
    )}
  </AnimatePresence>
);

const HomeView = ({ onUserClick, onGenerate, generatedItinerary }: { onUserClick: () => void, onGenerate: (itinerary: Itinerary) => void, generatedItinerary: Itinerary | null }) => {
  const [showLiveMap, setShowLiveMap] = useState(false);
  const [showAllDestinations, setShowAllDestinations] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [liveMapInfo, setLiveMapInfo] = useState<{ distance: string, description: string } | null>(null);
  const [isFetchingMapInfo, setIsFetchingMapInfo] = useState(false);

  const handleLiveMapClick = async () => {
    setShowLiveMap(true);
    if (!generatedItinerary) {
      setLiveMapInfo({
        distance: "0",
        description: "Please generate a trip first to see the distance to your destination."
      });
      return;
    }

    setIsFetchingMapInfo(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      let userLocation = "your current location";
      
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject);
        });
        userLocation = `latitude ${pos.coords.latitude}, longitude ${pos.coords.longitude}`;
      } catch (e) {
        console.warn("Geolocation not available", e);
      }

      const prompt = `Calculate the approximate distance in kilometers from ${userLocation} to ${generatedItinerary.country}. 
      Return ONLY a JSON object with two fields:
      - "distance": a string representing the formatted number of kilometers (e.g., "4,821").
      - "description": a short string describing the route (e.g., "From your current location to ${generatedItinerary.country}.").`;

      const response = await withRetry(() => ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              distance: { type: Type.STRING },
              description: { type: Type.STRING }
            },
            required: ["distance", "description"]
          }
        }
      }));

      if (response.text) {
        setLiveMapInfo(JSON.parse(response.text));
      }
    } catch (error) {
      console.error("Error fetching map info:", error);
      setLiveMapInfo({
        distance: "Unknown",
        description: `From your current location to ${generatedItinerary.country}.`
      });
    } finally {
      setIsFetchingMapInfo(false);
    }
  };

  const handleSearchSubmit = async (query: string) => {
    const q = query.trim();
    if (!q) return;

    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          country: { type: Type.STRING },
          title: { type: Type.STRING },
          subtitle: { type: Type.STRING },
          description: { type: Type.STRING },
          items: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                time: { type: Type.STRING },
                title: { type: Type.STRING },
                desc: { type: Type.STRING },
                tip: { type: Type.STRING },
                img: { type: Type.STRING },
              },
              required: ["time", "title", "desc", "tip", "img"],
            },
          },
        },
        required: ["country", "title", "subtitle", "description", "items"],
      };

      const prompt = `Generate a travel itinerary based on the following search query: "${q}". 
      The query could be a destination, an aesthetic, or a combination. 
      Create a cohesive, high-aesthetic travel plan. 
      For each item, provide a high-quality image URL from Unsplash or Picsum that matches the vibe. 
      Use the seed parameter in picsum.photos to get relevant images (e.g., https://picsum.photos/seed/paris-cafe/800/600).`;

      const response = await withRetry(() => ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json",
          responseSchema: responseSchema,
        },
      }));

      if (response.text) {
        const itinerary = JSON.parse(response.text) as Itinerary;
        onGenerate(itinerary);
      }
    } catch (error: any) {
      console.error("Error generating search-based itinerary:", error);
      const errorStr = JSON.stringify(error).toLowerCase();
      const message = String(error?.message || "").toLowerCase();
      const status = String(error?.status || "").toLowerCase();
      const code = error?.code || error?.error?.code;

      const isRateLimit = 
        message.includes('429') || 
        message.includes('resource_exhausted') || 
        message.includes('quota') ||
        status === 'resource_exhausted' || 
        code === 429 ||
        errorStr.includes('429') ||
        errorStr.includes('resource_exhausted');

      if (isRateLimit) {
        alert("The AI is currently busy due to high demand. Please try again in a few moments.");
      } else {
        alert("Something went wrong while generating your journey. Please try again.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pb-32">
      <Header title="STYLEVOYAGE" onUserClick={onUserClick} />
      <div className="px-6 pt-4">
        <h2 className="text-4xl font-serif leading-tight mb-2 text-ink">
          <span className="italic">High Aesthetic,</span><br />
          Low Power.
        </h2>
        <p className="text-sm text-ink/60 mb-8">
          Effortless travel curation matched perfectly to your visual persona.
        </p>

        <div className="relative mb-8 z-20">
          <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${isSearching ? 'text-accent' : 'text-ink/40'}`} />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearching(true)}
            onBlur={() => setTimeout(() => setIsSearching(false), 200)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchQuery.trim()) {
                handleSearchSubmit(searchQuery);
                setIsSearching(false);
              }
            }}
            placeholder="Search aesthetics or destinations..."
            className={`w-full border rounded-full py-3.5 pl-12 pr-10 text-sm font-medium bg-white focus:outline-none transition-all shadow-sm ${isSearching ? 'border-accent ring-2 ring-accent/20' : 'border-ink/10'}`}
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-ink/40 hover:text-ink transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          
          {/* Search Suggestions Dropdown */}
          <AnimatePresence>
            {isSearching && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-ink/5 overflow-hidden"
              >
                <div className="p-2">
                  <div className="px-3 py-2 text-[10px] font-bold text-ink/40 tracking-widest uppercase">Trending Searches</div>
                  {['Parisian Elegance', 'Tokyo Zen', 'Dark Academia London', 'Mediterranean Summer', 'Romantic Vintage'].map((suggestion, i) => (
                    <button 
                      key={i}
                      onClick={() => {
                        setSearchQuery(suggestion);
                        setIsSearching(false);
                        handleSearchSubmit(suggestion);
                      }}
                      className="w-full text-left px-3 py-2.5 text-sm font-medium text-ink/80 hover:bg-ink/5 rounded-xl transition-colors flex items-center gap-2"
                    >
                      <Search className="w-3.5 h-3.5 text-ink/40" />
                      {suggestion}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div 
          className="relative h-48 rounded-3xl overflow-hidden mb-10 shadow-sm cursor-pointer"
          onClick={handleLiveMapClick}
        >
          <img src="https://picsum.photos/seed/map-vintage/800/400" className="w-full h-full object-cover" referrerPolicy="no-referrer" alt="Map" />
          <div className="absolute inset-0 bg-black/10" />
          <div className="absolute top-1/2 left-1/3 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md -translate-x-1/2 -translate-y-1/2">
            <MapPin className="w-4 h-4 text-accent" />
          </div>
          <div className="absolute top-1/3 right-1/4 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-md">
            <MapPin className="w-3 h-3 text-ink/60" />
          </div>
          
          <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-xl shadow-sm">
            <p className="text-[10px] font-bold text-accent tracking-widest uppercase mb-0.5">Live Map</p>
            <p className="text-sm font-serif">Discover Routes</p>
          </div>
          <button className="absolute bottom-4 right-4 w-10 h-10 bg-accent text-white rounded-full flex items-center justify-center shadow-md">
            <Compass className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif text-xl">Hunt your Stylish Trip</h3>
          <button 
            onClick={() => setShowAllDestinations(true)}
            className="text-[10px] font-bold text-accent tracking-widest uppercase hover:underline"
          >
            View All
          </button>
        </div>

        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4 -mx-6 px-6">
          {[
            { tag: 'FRANCE', style: 'ROMANTIC VINTAGE', title: 'Parisian Elegance', img: 'https://picsum.photos/seed/paris-elegant/400/600' },
            { tag: 'JAPAN', style: 'MINIMALIST', title: 'Tokyo Zen Paths', img: 'https://picsum.photos/seed/tokyo-zen/400/600' },
            { tag: 'ITALY', style: 'CLASSIC', title: 'Roman Holiday', img: 'https://picsum.photos/seed/roman-holiday/400/600' }
          ].map((item, i) => (
            <div 
              key={i} 
              className="relative w-56 h-72 rounded-3xl overflow-hidden shrink-0 shadow-sm cursor-pointer hover:opacity-95 transition-opacity"
              onClick={() => handleSearchSubmit(item.title)}
            >
              <img src={item.img} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt={item.title} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute top-4 left-4 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full">
                <span className="text-[10px] font-bold text-white tracking-widest uppercase">{item.tag}</span>
              </div>
              <div className="absolute bottom-4 left-4 right-4">
                <p className="text-[10px] font-bold text-white/80 tracking-widest uppercase mb-1">{item.style}</p>
                <h4 className="font-serif text-xl text-white">{item.title}</h4>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Live Map Modal */}
      <AnimatePresence>
        {showLiveMap && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowLiveMap(false)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.95, opacity: 0 }} 
              className="w-full max-w-sm bg-white rounded-[2rem] overflow-hidden shadow-2xl p-6 text-center"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-8 h-8 text-accent" />
              </div>
              <h2 className="text-2xl font-serif text-ink mb-2">Distance to Destination</h2>
              {isFetchingMapInfo ? (
                <div className="py-8 flex flex-col items-center justify-center">
                  <Loader2 className="w-8 h-8 text-accent animate-spin mb-4" />
                  <p className="text-sm text-ink/60">Calculating distance...</p>
                </div>
              ) : liveMapInfo ? (
                <>
                  <div className="text-5xl font-light text-accent mb-4">{liveMapInfo.distance} <span className="text-xl">km</span></div>
                  <p className="text-sm text-ink/60 mb-6">{liveMapInfo.description}</p>
                </>
              ) : (
                <>
                  <div className="text-5xl font-light text-accent mb-4">0 <span className="text-xl">km</span></div>
                  <p className="text-sm text-ink/60 mb-6">Please generate a trip first.</p>
                </>
              )}
              <button 
                onClick={() => setShowLiveMap(false)}
                className="w-full py-3 bg-ink text-white rounded-xl font-bold text-sm hover:bg-ink/90 transition-colors"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* All Destinations Modal */}
      <AnimatePresence>
        {showAllDestinations && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: 20 }} 
            className="fixed inset-0 z-50 bg-paper overflow-y-auto pb-32"
          >
            <Header 
              title="ALL DESTINATIONS" 
              leftIcon={
                <button onClick={() => setShowAllDestinations(false)} className="focus:outline-none">
                  <ChevronLeft className="w-6 h-6 text-ink" />
                </button>
              } 
              onUserClick={onUserClick} 
            />
            <div className="px-6 pt-4 grid grid-cols-2 gap-4">
              {[
                { tag: 'FRANCE', style: 'ROMANTIC VINTAGE', title: 'Parisian Elegance', img: 'https://picsum.photos/seed/paris-elegant/400/600' },
                { tag: 'JAPAN', style: 'MINIMALIST', title: 'Tokyo Zen Paths', img: 'https://picsum.photos/seed/tokyo-zen/400/600' },
                { tag: 'ITALY', style: 'CLASSIC', title: 'Roman Holiday', img: 'https://picsum.photos/seed/roman-holiday/400/600' },
                { tag: 'UK', style: 'DARK ACADEMIA', title: 'London Fog', img: 'https://picsum.photos/seed/london-fog/400/600' },
                { tag: 'SPAIN', style: 'VIBRANT', title: 'Barcelona Sun', img: 'https://picsum.photos/seed/bcn-sun/400/600' },
                { tag: 'KOREA', style: 'MODERN', title: 'Seoul Nights', img: 'https://picsum.photos/seed/seoul-nights/400/600' },
              ].map((item, i) => (
                <div 
                  key={i} 
                  className="relative aspect-[3/4] rounded-2xl overflow-hidden shadow-sm cursor-pointer hover:opacity-95 transition-opacity"
                  onClick={() => {
                    setShowAllDestinations(false);
                    handleSearchSubmit(item.title);
                  }}
                >
                  <img src={item.img} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt={item.title} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute top-3 left-3 bg-white/20 backdrop-blur-md px-2 py-0.5 rounded-full">
                    <span className="text-[8px] font-bold text-white tracking-widest uppercase">{item.tag}</span>
                  </div>
                  <div className="absolute bottom-3 left-3 right-3">
                    <p className="text-[8px] font-bold text-white/80 tracking-widest uppercase mb-0.5">{item.style}</p>
                    <h4 className="font-serif text-sm text-white leading-tight">{item.title}</h4>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Generating Overlay */}
      <LoadingOverlay isVisible={isGenerating} />
    </motion.div>
  );
};

const SurpriseView = ({ onUserClick, onGenerate }: { onUserClick: () => void, onGenerate: (itinerary: Itinerary) => void }) => {
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [uploadActive, setUploadActive] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isSearchingCountry, setIsSearchingCountry] = useState(false);
  const [customCountry, setCustomCountry] = useState('');
  const [countries, setCountries] = useState(['France', 'Japan', 'Italy', 'UK', 'Spain', 'South Korea']);
  
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);

  // Cleanup camera on unmount
  React.useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleHunt = async () => {
    if (!selectedCountry) {
      alert("Please select a destination country.");
      return;
    }
    if (!uploadedImage && !selectedStyle) {
      alert("Please upload a photo or choose a style.");
      return;
    }

    setIsGenerating(true);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const prompt = `Generate a travel itinerary for ${selectedCountry}. 
      ${selectedStyle ? `The aesthetic style should be: ${selectedStyle}.` : 'Analyze the provided image to determine the aesthetic style and base the itinerary on it.'}
      Provide a 1-day itinerary with 3-4 items.
      Return the response in JSON format matching this schema:
      {
        "country": "string",
        "title": "string (e.g., Day 1)",
        "subtitle": "string (e.g., Parisian Vibe)",
        "description": "string (a short description of the persona/vibe)",
        "items": [
          {
            "time": "string (e.g., 10:00 AM)",
            "title": "string",
            "desc": "string",
            "tip": "string",
            "img": "string (a keyword for picsum seed, e.g., 'cafe', 'museum')"
          }
        ]
      }`;

      const parts: any[] = [{ text: prompt }];

      if (uploadedImage) {
        const base64Data = uploadedImage.split(',')[1];
        const mimeType = uploadedImage.split(';')[0].split(':')[1];
        parts.unshift({
          inlineData: {
            data: base64Data,
            mimeType: mimeType
          }
        });
      }

      const response = await withRetry(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              country: { type: Type.STRING },
              title: { type: Type.STRING },
              subtitle: { type: Type.STRING },
              description: { type: Type.STRING },
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    time: { type: Type.STRING },
                    title: { type: Type.STRING },
                    desc: { type: Type.STRING },
                    tip: { type: Type.STRING },
                    img: { type: Type.STRING }
                  },
                  required: ["time", "title", "desc", "tip", "img"]
                }
              }
            },
            required: ["country", "title", "subtitle", "description", "items"]
          }
        }
      }));

      const text = response.text;
      if (text) {
        const itinerary: Itinerary = JSON.parse(text);
        // Map the img keywords to actual picsum urls
        itinerary.items = itinerary.items.map(item => ({
          ...item,
          img: `https://picsum.photos/seed/${encodeURIComponent(item.img)}/600/400`
        }));
        onGenerate(itinerary);
      }
    } catch (error: any) {
      console.error("Error generating itinerary:", error);
      const errorStr = JSON.stringify(error).toLowerCase();
      const message = String(error?.message || "").toLowerCase();
      const status = String(error?.status || "").toLowerCase();
      const code = error?.code || error?.error?.code;

      const isRateLimit = 
        message.includes('429') || 
        message.includes('resource_exhausted') || 
        message.includes('quota') ||
        status === 'resource_exhausted' || 
        code === 429 ||
        errorStr.includes('429') ||
        errorStr.includes('resource_exhausted');

      if (isRateLimit) {
        alert("The AI is currently busy due to high demand. Please try again in a few moments.");
      } else {
        alert("Failed to generate itinerary. Please try again.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      streamRef.current = stream;
      setIsCameraOpen(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }, 100);
    } catch (err) {
      console.warn('Camera permission denied or not available:', err);
      alert('Unable to access camera. Please check permissions.');
    }
  };

  const closeCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setUploadedImage(dataUrl);
        setCameraActive(true);
        setUploadActive(false);
        closeCamera();
      }
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pb-32 overflow-hidden">
      <Header title="HUNT YOUR TRIP" onUserClick={onUserClick} />
      <div className="px-6 pt-4 text-center relative">
        <div className="w-24 h-24 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-6 relative z-10">
          <span className="text-6xl">🏹</span>
        </div>
        <h2 className="text-3xl font-serif leading-tight mb-3 text-ink">
          Hunt your<br />Perfect Route
        </h2>
        <p className="text-sm text-ink/60 mb-10 px-4">
          Upload an inspiration photo or pick a style, tell us where, and we'll craft a bespoke journey.
        </p>

        <div className="text-left mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-6 h-6 rounded-full bg-ink text-white flex items-center justify-center text-xs font-bold">1</div>
            <h3 className="text-xs font-bold tracking-widest uppercase">Set the Vibe</h3>
          </div>
          
          <input 
            type="file" 
            accept="image/*" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
          />

          <AnimatePresence>
            {isCameraOpen && (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                className="fixed inset-0 z-50 bg-black flex flex-col"
              >
                <div className="flex-1 relative flex items-center justify-center overflow-hidden">
                  <video 
                    ref={videoRef} 
                    playsInline 
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <canvas ref={canvasRef} className="hidden" />
                </div>
                <div className="h-32 bg-black flex items-center justify-center gap-8 pb-safe">
                  <button 
                    onClick={closeCamera}
                    className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white"
                  >
                    <X className="w-6 h-6" />
                  </button>
                  <button 
                    onClick={capturePhoto}
                    className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center"
                  >
                    <div className="w-16 h-16 rounded-full bg-white" />
                  </button>
                  <div className="w-12 h-12" /> {/* Spacer for balance */}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex gap-4 mb-6">
            <button 
              onClick={() => { 
                setUploadActive(true); 
                setCameraActive(false); 
                fileInputRef.current?.click(); 
              }}
              className={`flex-1 border-2 border-dashed py-6 rounded-2xl flex flex-col items-center justify-center gap-2 transition-colors relative overflow-hidden ${uploadActive ? 'border-accent bg-accent/10 text-accent' : 'border-ink/10 bg-white text-ink/60 hover:bg-ink/5'}`}
            >
              {uploadedImage && uploadActive ? (
                <img src={uploadedImage} alt="Uploaded" className="absolute inset-0 w-full h-full object-cover opacity-50" />
              ) : null}
              <Upload className="w-6 h-6 relative z-10" />
              <span className="text-sm font-medium relative z-10">{uploadedImage && uploadActive ? 'Change Photo' : 'Upload Photo'}</span>
            </button>
            <button 
              onClick={() => { 
                openCamera();
              }}
              className={`flex-1 border-2 border-dashed py-6 rounded-2xl flex flex-col items-center justify-center gap-2 transition-colors relative overflow-hidden ${cameraActive ? 'border-accent bg-accent/10 text-accent' : 'border-ink/10 bg-white text-ink/60 hover:bg-ink/5'}`}
            >
              {uploadedImage && cameraActive ? (
                <img src={uploadedImage} alt="Captured" className="absolute inset-0 w-full h-full object-cover opacity-50" />
              ) : null}
              <Camera className="w-6 h-6 relative z-10" />
              <span className="text-sm font-medium relative z-10">{uploadedImage && cameraActive ? 'Retake Picture' : 'Take Picture'}</span>
            </button>
          </div>

          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-[1px] bg-ink/10" />
            <span className="text-[10px] font-bold text-ink/40 tracking-widest uppercase">Or Choose Style</span>
            <div className="flex-1 h-[1px] bg-ink/10" />
          </div>

          <div className="grid grid-cols-3 gap-3 mb-10">
            {[
              { name: 'Romantic Vintage', img: 'https://picsum.photos/seed/vintage-room/200/200' },
              { name: 'Minimalist', img: 'https://picsum.photos/seed/minimal-arch/200/200' },
              { name: 'Dark Academia', img: 'https://picsum.photos/seed/dark-acad/200/200' }
            ].map((style, i) => (
              <div 
                key={i} 
                onClick={() => setSelectedStyle(style.name)}
                className={`relative aspect-square rounded-2xl overflow-hidden shadow-sm cursor-pointer transition-all ${selectedStyle === style.name ? 'ring-4 ring-accent scale-95' : 'hover:opacity-90'}`}
              >
                <img src={style.img} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt={style.name} />
                <div className="absolute inset-0 bg-black/40" />
                <div className="absolute bottom-2 left-2 right-2">
                  <p className="text-[10px] font-bold text-white leading-tight">{style.name}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-6 h-6 rounded-full bg-ink text-white flex items-center justify-center text-xs font-bold">2</div>
            <h3 className="text-xs font-bold tracking-widest uppercase">Where To?</h3>
          </div>

          <div className="flex flex-wrap gap-3 mb-10">
            {countries.map((country) => (
              <button 
                key={country} 
                onClick={() => setSelectedCountry(country)}
                className={`px-5 py-2 rounded-full border text-sm font-medium transition-colors ${selectedCountry === country ? 'border-accent bg-accent text-white shadow-md' : 'border-ink/10 text-ink/80 hover:border-ink/30 bg-white'}`}
              >
                {country}
              </button>
            ))}
            {selectedCountry && !countries.includes(selectedCountry) && (
              <button 
                onClick={() => setSelectedCountry(selectedCountry)}
                className="px-5 py-2 rounded-full border text-sm font-medium transition-colors border-accent bg-accent text-white shadow-md"
              >
                {selectedCountry}
              </button>
            )}
            {isSearchingCountry ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-accent bg-accent/5">
                <input
                  type="text"
                  value={customCountry}
                  onChange={(e) => setCustomCountry(e.target.value)}
                  placeholder="Type country..."
                  className="bg-transparent border-none outline-none text-sm w-24 text-ink"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && customCountry.trim()) {
                      const newCountry = customCountry.trim();
                      setSelectedCountry(newCountry);
                      setIsSearchingCountry(false);
                      setCustomCountry('');
                    } else if (e.key === 'Escape') {
                      setIsSearchingCountry(false);
                      setCustomCountry('');
                    }
                  }}
                />
                <button 
                  onClick={() => {
                    if (customCountry.trim()) {
                      const newCountry = customCountry.trim();
                      setSelectedCountry(newCountry);
                    }
                    setIsSearchingCountry(false);
                    setCustomCountry('');
                  }}
                  className="text-accent hover:text-accent/80"
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setIsSearchingCountry(true)}
                className="px-5 py-2 rounded-full border border-dashed border-accent/40 text-accent text-sm font-medium flex items-center gap-1 bg-accent/5 hover:bg-accent/10 transition-colors"
              >
                <MapPin className="w-3.5 h-3.5" />
                Search more
              </button>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <button 
              onClick={handleHunt}
              className="w-full py-4 bg-accent text-white rounded-2xl font-bold tracking-widest uppercase text-sm shadow-md hover:bg-accent/90 transition-colors relative overflow-hidden"
            >
              HUNT YOUR STYLISH TRIP
            </button>
            
            {/* Removed Generate Vibe Video button */}
            
            {uploadedImage && (
              <div className="w-full h-48 rounded-2xl overflow-hidden shadow-sm relative">
                <img src={uploadedImage} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt="Uploaded" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Removed Video Modal */}
      
      {/* Generating Overlay */}
      <LoadingOverlay isVisible={isGenerating} />
    </motion.div>
  );
};

const TripView = ({ onUserClick, itinerary, onBack, onUpdateItinerary }: { onUserClick: () => void, itinerary?: Itinerary | null, onBack?: () => void, onUpdateItinerary?: (itinerary: Itinerary) => void }) => {
  const [showWeather, setShowWeather] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showModifyModal, setShowModifyModal] = useState(false);
  const [modifyPrompt, setModifyPrompt] = useState('');
  const [isModifying, setIsModifying] = useState(false);
  const [proposedItinerary, setProposedItinerary] = useState<Itinerary | null>(null);
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [copied, setCopied] = useState(false);
  const [weatherData, setWeatherData] = useState<{temperature: string, condition: string, time: string, imageUrl: string} | null>(null);
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);
  const [weatherAdaptedItinerary, setWeatherAdaptedItinerary] = useState<ItineraryItem[] | null>(null);
  const [isAdaptingItinerary, setIsAdaptingItinerary] = useState(false);

  const displayItinerary = itinerary || {
    country: 'France',
    title: 'Day 1',
    subtitle: 'Parisian Vibe.',
    description: 'A personalized cinematic itinerary aligned with your "Lazy & Romantic Estate" persona.',
    items: [
      {
        time: '10:00 AM',
        title: 'Morning Light at Le Marais',
        desc: 'Avoid common tourist traps. Start your day with a curated walk through independent shops.',
        tip: 'Golden Moment: 10:15 AM for soft shadows.',
        img: 'https://picsum.photos/seed/marais-morning/600/400'
      },
      {
        time: '2:00 PM',
        title: 'Niche Art Space Exploration',
        desc: 'An exclusive boutique with the same visual texture as your aesthetic profile.',
        tip: 'Photo Location Guide: Stand near the arched window.',
        img: 'https://picsum.photos/seed/art-space/600/400'
      },
      {
        time: '6:30 PM',
        title: 'Romantic Dinner Scene',
        desc: 'End the day at a hidden vintage cafe matching the "Southern France" vibe.',
        tip: 'Golden Hour: 6:45 PM. Perfect lighting.',
        img: 'https://picsum.photos/seed/vintage-cafe/600/400'
      }
    ]
  };

  React.useEffect(() => {
    let isMounted = true;
    const fetchWeather = async () => {
      setIsLoadingWeather(true);
      try {
        const data = await getRealWeather(displayItinerary.country);
        if (isMounted) {
          setWeatherData(data);
          const isBadWeather = /rain|storm|snow|shower|drizzle|cloud|overcast/i.test(data.condition);
          if (isBadWeather) {
            setIsAdaptingItinerary(true);
            try {
              const adapted = await getWeatherAdaptedItinerary(displayItinerary.items, data.condition, displayItinerary.country);
              if (isMounted) setWeatherAdaptedItinerary(adapted);
            } catch (e) {
              console.error(e);
            } finally {
              if (isMounted) setIsAdaptingItinerary(false);
            }
          } else {
            if (isMounted) setWeatherAdaptedItinerary(null);
          }
        }
      } catch (error) {
        console.error("Failed to fetch weather:", error);
      } finally {
        if (isMounted) {
          setIsLoadingWeather(false);
        }
      }
    };
    fetchWeather();
    return () => { isMounted = false; };
  }, [displayItinerary.country]);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My StyleVoyage Itinerary',
          text: `Check out my curated aesthetic travel route for ${displayItinerary.country}!`,
          url: window.location.href,
        });
      } catch (err) {
        console.warn('Error sharing:', err);
        setShowShareModal(true);
      }
    } else {
      setShowShareModal(true);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleModify = async () => {
    if (!modifyPrompt.trim()) return;
    setIsModifying(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `Here is a travel itinerary:
${JSON.stringify(displayItinerary, null, 2)}

The user wants to modify it with the following request: "${modifyPrompt}"

Please provide an updated 1-day itinerary with 3-4 items.
Return the response in JSON format matching this schema:
{
  "country": "string",
  "title": "string",
  "subtitle": "string",
  "description": "string",
  "items": [
    {
      "time": "string",
      "title": "string",
      "desc": "string",
      "tip": "string",
      "img": "string (a highly descriptive prompt for an image generation AI to generate a photo of this stop)"
    }
  ]
}`;

      const response = await withRetry(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              country: { type: Type.STRING },
              title: { type: Type.STRING },
              subtitle: { type: Type.STRING },
              description: { type: Type.STRING },
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    time: { type: Type.STRING },
                    title: { type: Type.STRING },
                    desc: { type: Type.STRING },
                    tip: { type: Type.STRING },
                    img: { type: Type.STRING }
                  },
                  required: ["time", "title", "desc", "tip", "img"]
                }
              }
            },
            required: ["country", "title", "subtitle", "description", "items"]
          }
        }
      }));

      const text = response.text;
      if (text) {
        const newItinerary: Itinerary = JSON.parse(text);
        setProposedItinerary(newItinerary);
      }
    } catch (error: any) {
      console.error("Error generating preview:", error);
      const errorStr = JSON.stringify(error).toLowerCase();
      const message = String(error?.message || "").toLowerCase();
      const status = String(error?.status || "").toLowerCase();
      const code = error?.code || error?.error?.code;

      const isRateLimit = 
        message.includes('429') || 
        message.includes('resource_exhausted') || 
        message.includes('quota') ||
        status === 'resource_exhausted' || 
        code === 429 ||
        errorStr.includes('429') ||
        errorStr.includes('resource_exhausted');

      if (isRateLimit) {
        alert("The AI is currently busy due to high demand. Please try again in a few moments.");
      } else {
        alert("Failed to generate preview. Please try again.");
      }
    } finally {
      setIsModifying(false);
    }
  };

  const handleAcceptModification = async () => {
    if (!proposedItinerary) return;
    setIsGeneratingImages(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      // Generate images for each item using gemini-2.5-flash-image
      const updatedItems = await Promise.all(proposedItinerary.items.map(async (item) => {
        try {
          const imgResponse = await withRetry(() => ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
              parts: [{ text: item.img }],
            },
            config: {
              imageConfig: {
                aspectRatio: "16:9"
              }
            }
          }));
          
          let base64Img = null;
          for (const part of imgResponse.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
              base64Img = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
              break;
            }
          }
          
          return {
            ...item,
            img: base64Img || `https://picsum.photos/seed/${encodeURIComponent(item.title)}/600/400`
          };
        } catch (imgError) {
          console.error("Error generating image for item:", item.title, imgError);
          return {
            ...item,
            img: `https://picsum.photos/seed/${encodeURIComponent(item.title)}/600/400`
          };
        }
      }));
      
      const finalItinerary = {
        ...proposedItinerary,
        items: updatedItems
      };

      if (onUpdateItinerary) {
        onUpdateItinerary(finalItinerary);
      }
      setShowModifyModal(false);
      setModifyPrompt('');
      setProposedItinerary(null);
    } catch (error: any) {
      console.error("Error finalizing itinerary:", error);
      const errorStr = JSON.stringify(error).toLowerCase();
      const message = String(error?.message || "").toLowerCase();
      const status = String(error?.status || "").toLowerCase();
      const code = error?.code || error?.error?.code;

      const isRateLimit = 
        message.includes('429') || 
        message.includes('resource_exhausted') || 
        message.includes('quota') ||
        status === 'resource_exhausted' || 
        code === 429 ||
        errorStr.includes('429') ||
        errorStr.includes('resource_exhausted');

      if (isRateLimit) {
        alert("The AI is currently busy due to high demand. Please try again in a few moments.");
      } else {
        alert("Failed to finalize itinerary. Please try again.");
      }
    } finally {
      setIsGeneratingImages(false);
    }
  };

  const handleRejectModification = () => {
    setProposedItinerary(null);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pb-32">
      <Header 
        title="YOUR ROUTE" 
        leftIcon={
          <button onClick={onBack} className="focus:outline-none">
            <ChevronLeft className="w-6 h-6 text-ink" />
          </button>
        } 
        onUserClick={onUserClick} 
      />
      <div className="px-6 pt-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="bg-accent/10 text-accent text-[10px] font-bold tracking-widest uppercase px-2 py-1 rounded">Planned Route</span>
            <div className="flex items-center gap-1 text-ink/60 text-xs font-medium">
              <MapPin className="w-3 h-3" />
              {displayItinerary.country}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleShare}
              className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm border border-ink/5 hover:bg-paper transition-colors"
            >
              <Share2 className="w-4 h-4 text-accent" />
            </button>
            <button 
              onClick={() => setShowWeather(true)}
              className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm border border-ink/5 hover:bg-paper transition-colors"
            >
              <CloudRain className="w-4 h-4 text-accent" />
            </button>
          </div>
        </div>

        <h2 className="text-4xl font-serif leading-tight mb-3 text-ink">
        <span className="italic">{displayItinerary.title}</span><br />
        {displayItinerary.subtitle}
      </h2>
      <p className="text-sm text-ink/60 mb-10">
        {displayItinerary.description}
      </p>

      <div className="relative pl-6 space-y-10">
        {/* Timeline Line */}
        <div className="absolute left-[7px] top-2 bottom-0 w-[1px] bg-accent/30" />

        {displayItinerary.items.map((item, i) => (
          <div key={i} className="relative">
            {/* Timeline Dot */}
            <div className="absolute -left-[29px] top-0 w-4 h-4 rounded-full border-[3px] border-accent bg-white flex items-center justify-center z-10">
              <div className="w-1.5 h-1.5 bg-accent rounded-full" />
            </div>

            <div className="flex items-center gap-2 text-accent text-xs font-bold tracking-widest uppercase mb-3">
              <Clock className="w-3.5 h-3.5" />
              {item.time}
            </div>

            <div className="relative aspect-[3/2] rounded-3xl overflow-hidden mb-3 shadow-sm">
              <img src={item.img} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt={item.title} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 text-white">
                <h3 className="font-serif text-xl mb-1">{item.title}</h3>
                <p className="text-xs text-white/80 leading-relaxed">{item.desc}</p>
              </div>
            </div>

            <div className="bg-accent/5 border border-accent/10 rounded-xl p-3 flex items-center gap-3">
              <Camera className="w-4 h-4 text-accent shrink-0" />
              <p className="text-xs font-medium italic text-ink/80">{item.tip}</p>
            </div>
          </div>
        ))}
      </div>

      <button 
        onClick={() => setShowModifyModal(true)}
        className="w-full mt-10 py-4 border-2 border-dashed border-ink/20 text-ink/60 rounded-2xl font-medium text-sm flex items-center justify-center gap-2 hover:bg-ink/5 transition-colors"
      >
        <Send className="w-4 h-4" />
        Modify Route
      </button>
    </div>

    {/* Modify Route Modal */}
    <AnimatePresence>
      {showModifyModal && (
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-6"
          onClick={() => !isModifying && !isGeneratingImages && setShowModifyModal(false)}
        >
          <motion.div 
            initial={{ y: "100%" }} 
            animate={{ y: 0 }} 
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="w-full max-w-md bg-paper rounded-t-[2rem] sm:rounded-[2rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 border-b border-ink/10 flex items-center justify-between shrink-0">
              <h3 className="font-serif text-xl font-bold text-ink">Modify Route</h3>
              <button 
                onClick={() => {
                  if (!isModifying && !isGeneratingImages) {
                    setShowModifyModal(false);
                    setProposedItinerary(null);
                  }
                }}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-ink/5 text-ink/60 hover:bg-ink/10 transition-colors"
                disabled={isModifying || isGeneratingImages}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              {!proposedItinerary ? (
                <>
                  <p className="text-sm text-ink/60 mb-4">
                    Tell us how you'd like to adjust your itinerary. E.g., "Add more food stops", "Make it more relaxing", "Include a museum".
                  </p>
                  <textarea
                    value={modifyPrompt}
                    onChange={(e) => setModifyPrompt(e.target.value)}
                    placeholder="Your request..."
                    className="w-full h-32 p-4 rounded-xl border border-ink/20 bg-white text-ink placeholder:text-ink/30 focus:outline-none focus:border-accent resize-none mb-6"
                    disabled={isModifying}
                  />
                  <button 
                    onClick={handleModify}
                    disabled={isModifying || !modifyPrompt.trim()}
                    className="w-full py-4 bg-accent text-white rounded-2xl font-bold tracking-widest uppercase text-sm shadow-md hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isModifying ? (
                      <>
                        <motion.div 
                          animate={{ rotate: 360 }} 
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                        />
                        GENERATING PREVIEW...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        PREVIEW CHANGES
                      </>
                    )}
                  </button>
                </>
              ) : (
                <>
                  <div className="mb-6">
                    <h4 className="font-serif text-lg font-bold text-ink mb-2">Proposed Changes:</h4>
                    <div className="bg-white border border-ink/10 rounded-xl p-4 space-y-4">
                      <div>
                        <p className="text-xs font-bold text-accent uppercase tracking-widest mb-1">{proposedItinerary.title}</p>
                        <p className="text-sm font-medium text-ink">{proposedItinerary.subtitle}</p>
                      </div>
                      <div className="space-y-3">
                        {proposedItinerary.items.map((item, idx) => (
                          <div key={idx} className="flex gap-3">
                            <div className="w-16 shrink-0 text-xs font-bold text-ink/60 pt-0.5">{item.time}</div>
                            <div>
                              <p className="text-sm font-bold text-ink">{item.title}</p>
                              <p className="text-xs text-ink/70 mt-0.5 line-clamp-2">{item.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={handleRejectModification}
                      disabled={isGeneratingImages}
                      className="flex-1 py-4 bg-ink/5 text-ink rounded-2xl font-bold tracking-widest uppercase text-sm hover:bg-ink/10 transition-colors disabled:opacity-50"
                    >
                      REJECT
                    </button>
                    <button 
                      onClick={handleAcceptModification}
                      disabled={isGeneratingImages}
                      className="flex-[2] py-4 bg-accent text-white rounded-2xl font-bold tracking-widest uppercase text-sm shadow-md hover:bg-accent/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isGeneratingImages ? (
                        <>
                          <motion.div 
                            animate={{ rotate: 360 }} 
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                          />
                          APPLYING...
                        </>
                      ) : (
                        'ACCEPT & APPLY'
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

    {/* Weather Modal */}
    <AnimatePresence>
      {showWeather && (
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
          onClick={() => setShowWeather(false)}
        >
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }} 
            exit={{ scale: 0.95, opacity: 0 }} 
            className="w-full max-w-sm bg-[#F9F8F6] rounded-[2rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            onClick={e => e.stopPropagation()}
          >
            {/* Weather Card Header */}
            <div className="p-4 shrink-0">
              <div className="relative h-64 rounded-[2rem] overflow-hidden shadow-lg">
                {isLoadingWeather ? (
                  <div className="w-full h-full bg-ink/5 flex items-center justify-center">
                    <motion.div 
                      animate={{ rotate: 360 }} 
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full"
                    />
                  </div>
                ) : weatherData ? (
                  <>
                    <img src={weatherData.imageUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt="Weather" />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/10 to-black/60" />
                    <button 
                      onClick={() => setShowWeather(false)}
                      className="absolute top-4 right-4 w-8 h-8 bg-black/20 backdrop-blur-md text-white rounded-full flex items-center justify-center hover:bg-black/40 transition-colors z-10 pointer-events-auto"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="absolute inset-0 p-6 flex flex-col justify-between text-white pointer-events-none">
                      <div className="flex justify-between items-start">
                        <div className="mt-2">
                          <h2 className="font-serif text-[3rem] font-bold leading-none tracking-tight mb-2 drop-shadow-md">{displayItinerary.country}</h2>
                          <div className="flex items-center gap-2 text-white font-bold drop-shadow-md">
                            {weatherData.condition.toLowerCase().includes('sun') || weatherData.condition.toLowerCase().includes('clear') ? (
                              <span className="text-xl">🌞</span>
                            ) : weatherData.condition.toLowerCase().includes('rain') || weatherData.condition.toLowerCase().includes('shower') ? (
                              <CloudRain className="w-5 h-5" />
                            ) : weatherData.condition.toLowerCase().includes('storm') ? (
                              <CloudLightning className="w-5 h-5" />
                            ) : weatherData.condition.toLowerCase().includes('snow') ? (
                              <CloudSnow className="w-5 h-5" />
                            ) : (
                              <Cloud className="w-5 h-5" />
                            )}
                            <span className="text-lg">{weatherData.time}</span>
                          </div>
                        </div>
                        <div className="text-[6rem] font-sans font-bold leading-none tracking-tighter drop-shadow-lg">{weatherData.temperature}</div>
                      </div>
                      <div className="flex justify-between items-end mb-2">
                        <div className="text-[11px] font-bold tracking-[0.15em] uppercase drop-shadow-md">
                          STYLE VOYAGE FORECAST
                        </div>
                        <div className="font-bold text-base drop-shadow-md mb-1.5 capitalize">
                          {weatherData.condition}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full bg-ink/5 flex items-center justify-center text-ink/40">
                    Failed to load weather
                  </div>
                )}
              </div>
            </div>
            
            {/* Content Area */}
            <div className="px-6 pb-6 overflow-y-auto">
              {isLoadingWeather ? (
                <div className="flex justify-center py-8">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full" />
                </div>
              ) : weatherData && /rain|storm|snow|shower|drizzle|cloud|overcast/i.test(weatherData.condition) ? (
                <>
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-serif text-[#2C2C2C] mb-2">
                      <span className="italic">Weather changed?</span>
                    </h2>
                    <h2 className="text-2xl font-serif text-[#8B2323] font-bold">
                      We can adapt your script.
                    </h2>
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-bold text-ink/60 tracking-widest uppercase">Updated Itinerary</h3>
                    <button className="text-xs font-medium text-accent hover:underline">Indoor Alternatives</button>
                  </div>
                  
                  {isAdaptingItinerary ? (
                    <div className="flex justify-center py-8">
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full" />
                    </div>
                  ) : weatherAdaptedItinerary ? (
                    <div className="space-y-3">
                      {weatherAdaptedItinerary.map((item, i) => (
                        <div key={i} className="bg-white rounded-xl p-4 flex gap-3 items-start border border-ink/5 relative overflow-hidden shadow-sm">
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent" />
                          <div className="w-8 h-8 rounded-full bg-accent/5 flex items-center justify-center shrink-0 mt-0.5">
                            <Clock className="w-4 h-4 text-accent" />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-ink/60 mb-0.5">{item.time}</p>
                            <h4 className="font-serif text-lg text-ink mb-0.5">{item.title}</h4>
                            <div className="flex items-center gap-1 text-[10px] text-ink/60">
                              <MapPin className="w-2.5 h-2.5" />
                              {item.desc}
                            </div>
                          </div>
                        </div>
                      ))}
                      <button 
                        onClick={() => {
                          if (onUpdateItinerary) {
                            onUpdateItinerary({ ...displayItinerary, items: weatherAdaptedItinerary });
                          }
                          setShowWeather(false);
                        }}
                        className="w-full mt-4 py-3 bg-accent text-white rounded-xl font-bold tracking-widest uppercase text-xs shadow-md hover:bg-accent/90 transition-colors"
                      >
                        Apply Adapted Itinerary
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-ink/60 text-center">Failed to adapt itinerary.</p>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <h2 className="text-2xl font-serif text-[#2C2C2C] mb-2">
                    <span className="italic">Perfect weather!</span>
                  </h2>
                  <h2 className="text-2xl font-serif text-accent font-bold">
                    Your itinerary is good to go.
                  </h2>
                  <p className="text-sm text-ink/60 mt-4">No changes needed for {weatherData?.condition?.toLowerCase() || 'sunny'} weather.</p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

    {/* Share Modal */}
    <AnimatePresence>
      {showShareModal && (
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center p-4"
          onClick={() => setShowShareModal(false)}
        >
          <motion.div 
            initial={{ y: '100%' }} 
            animate={{ y: 0 }} 
            exit={{ y: '100%' }} 
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="w-full max-w-sm bg-white rounded-t-3xl sm:rounded-3xl overflow-y-auto max-h-[90vh] shadow-2xl p-6 pb-12"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-serif text-2xl text-ink">Share Itinerary</h3>
              <button 
                onClick={() => setShowShareModal(false)}
                className="w-8 h-8 bg-ink/5 rounded-full flex items-center justify-center hover:bg-ink/10 transition-colors"
              >
                <X className="w-4 h-4 text-ink" />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-6">
              {[
                { icon: Instagram, label: 'Story', color: 'bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 text-white' },
                { icon: Twitter, label: 'Post', color: 'bg-black text-white' },
                { icon: Facebook, label: 'Share', color: 'bg-[#1877F2] text-white' },
                { icon: MessageSquare, label: 'Message', color: 'bg-green-500 text-white' },
              ].map((platform, i) => (
                <button key={i} className="flex flex-col items-center gap-2 group">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform ${platform.color}`}>
                    <platform.icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-medium text-ink/60">{platform.label}</span>
                </button>
              ))}
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Link className="w-4 h-4 text-ink/40" />
              </div>
              <input 
                type="text" 
                readOnly 
                value={window.location.href}
                className="w-full bg-ink/5 border border-ink/10 rounded-xl py-3 pl-9 pr-24 text-sm text-ink/60 focus:outline-none"
              />
              <button 
                onClick={handleCopyLink}
                className="absolute inset-y-1 right-1 px-4 bg-white border border-ink/10 rounded-lg text-xs font-bold text-ink hover:bg-ink/5 transition-colors flex items-center gap-1 shadow-sm"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-green-500" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    Copy
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  </motion.div>
  );
};

type ChatMessage = {
  role: 'user' | 'model';
  text: string;
  time: string;
};

const MessageView = ({ onUserClick, itinerary }: { onUserClick: () => void, itinerary: Itinerary | null }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const initChat = async () => {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const systemInstruction = `You are a helpful travel concierge for StyleVoyage. 
      ${itinerary ? `The user is currently traveling to ${itinerary.country} on a ${itinerary.subtitle} trip.` : 'The user has not selected a destination yet.'}
      Provide helpful, concise, and stylish responses. Format your response in Markdown.`;

      chatRef.current = ai.chats.create({
        model: "gemini-3-flash-preview",
        config: {
          systemInstruction,
          tools: [{ googleSearch: {} }],
          toolConfig: { includeServerSideToolInvocations: true }
        }
      });

      if (itinerary) {
        setIsLoading(true);
        try {
          const prompt = `Are there any urgent updates, extreme weather conditions, strikes, protests, wars, or flu epidemics in ${itinerary.country} right now? If yes, provide a brief, urgent update. If no, just welcome the user to their trip. Format your response in Markdown.`;
          const response = await withRetry(() => chatRef.current.sendMessage({ message: prompt }));
          setMessages([{ role: 'model', text: response.text, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
        } catch (error) {
          console.error("Error fetching urgent update:", error);
          setMessages([{ role: 'model', text: `Welcome to your ${itinerary.country} trip! How can I assist you today?`, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
        } finally {
          setIsLoading(false);
        }
      } else {
        setMessages([{ role: 'model', text: "Welcome to StyleVoyage Concierge! How can I help you plan your next aesthetic journey?", time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
      }
    };

    initChat();
  }, [itinerary]);

  const handleSend = async () => {
    if (!input.trim() || !chatRef.current || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    setIsLoading(true);

    try {
      const response = await withRetry(() => chatRef.current.sendMessage({ message: userMessage }));
      setMessages(prev => [...prev, { role: 'model', text: response.text, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages(prev => [...prev, { role: 'model', text: "I'm sorry, I'm having trouble connecting right now. Please try again later.", time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pb-32 flex flex-col h-screen">
      <Header title="MESSAGE" onUserClick={onUserClick} />
      <div className="flex-1 overflow-y-auto px-6 pt-4 pb-4 space-y-6">
        <div className="text-center mb-6">
          <span className="text-[10px] font-bold text-ink/40 tracking-widest uppercase bg-ink/5 px-3 py-1 rounded-full">Today</span>
        </div>
        
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'self-end ml-auto flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full overflow-hidden shrink-0 border border-ink/10 flex items-center justify-center ${msg.role === 'model' ? 'bg-[#F5F1E8] p-1.5' : ''}`}>
              {msg.role === 'model' ? <SVLogo /> : <img src="https://picsum.photos/seed/eleanor/100/100" className="w-full h-full object-cover" referrerPolicy="no-referrer" alt="User" />}
            </div>
            <div className={`${msg.role === 'user' ? 'bg-ink text-white rounded-tr-none' : 'bg-white border border-ink/5 rounded-tl-none'} rounded-2xl p-4 shadow-sm`}>
              <div className={`text-sm leading-relaxed ${msg.role === 'model' ? 'text-ink markdown-body' : ''}`}>
                {msg.role === 'model' ? <Markdown>{msg.text}</Markdown> : msg.text}
              </div>
              <span className={`text-[10px] font-medium mt-2 block ${msg.role === 'user' ? 'text-white/60 text-right' : 'text-ink/40'}`}>{msg.time}</span>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3 max-w-[85%]">
            <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-ink/10 bg-[#F5F1E8] flex items-center justify-center p-1.5">
              <SVLogo />
            </div>
            <div className="bg-white border border-ink/5 rounded-2xl rounded-tl-none p-4 shadow-sm flex items-center justify-center">
              <Loader2 className="w-4 h-4 text-accent animate-spin" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="px-6 py-4 bg-white border-t border-ink/5 sticky bottom-16 z-40">
        <div className="relative">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type a message..." 
            className="w-full border border-ink/10 rounded-full py-3 pl-4 pr-12 text-sm bg-paper focus:outline-none focus:border-accent/30"
          />
          <button 
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-accent text-white rounded-full flex items-center justify-center hover:bg-accent/90 transition-colors disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

const AuthView = ({ onLogin }: { onLogin: () => void }) => {
  const [isLogin, setIsLogin] = useState(true);
  
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pb-32 px-6 pt-12">
      <div className="text-center mb-10">
        <h2 className="text-4xl font-serif text-ink mb-2">{isLogin ? 'Welcome Back' : 'Join Us'}</h2>
        <p className="text-sm text-ink/60">Curate your aesthetic journey.</p>
      </div>
      
      <div className="space-y-4 mb-8">
        {!isLogin && (
          <div>
            <label className="block text-xs font-bold text-ink/60 tracking-widest uppercase mb-2">Name</label>
            <input type="text" className="w-full border border-ink/10 rounded-xl py-3 px-4 text-sm bg-white focus:outline-none focus:border-accent/30" placeholder="Your name" />
          </div>
        )}
        <div>
          <label className="block text-xs font-bold text-ink/60 tracking-widest uppercase mb-2">Email</label>
          <input type="email" className="w-full border border-ink/10 rounded-xl py-3 px-4 text-sm bg-white focus:outline-none focus:border-accent/30" placeholder="your@email.com" />
        </div>
        <div>
          <label className="block text-xs font-bold text-ink/60 tracking-widest uppercase mb-2">Password</label>
          <input type="password" className="w-full border border-ink/10 rounded-xl py-3 px-4 text-sm bg-white focus:outline-none focus:border-accent/30" placeholder="••••••••" />
        </div>
      </div>
      
      <button onClick={onLogin} className="w-full py-4 bg-accent text-white rounded-2xl font-bold tracking-widest uppercase text-sm shadow-md hover:bg-accent/90 transition-colors mb-4">
        {isLogin ? 'Log In' : 'Sign Up'}
      </button>
      
      <div className="text-center">
        <button onClick={() => setIsLogin(!isLogin)} className="text-sm font-medium text-ink/60 hover:text-accent transition-colors">
          {isLogin ? "Don't have an account? Sign up" : "Already have an account? Log in"}
        </button>
      </div>
    </motion.div>
  );
};

const ProfileView = ({ onLogout, onUserClick }: { onLogout: () => void, onUserClick: () => void }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pb-32">
    <Header title="PROFILE" onUserClick={onUserClick} />
    <div className="px-6 pt-6">
      <div className="flex flex-col items-center mb-8">
        <div className="relative mb-4">
          <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-white shadow-md">
            <img src="https://picsum.photos/seed/eleanor/400/400" className="w-full h-full object-cover" referrerPolicy="no-referrer" alt="Avatar" />
          </div>
          <button className="absolute bottom-0 right-0 w-8 h-8 bg-accent text-white rounded-full flex items-center justify-center border-2 border-white shadow-sm hover:bg-accent/90 transition-colors">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
        </div>
        <h2 className="font-serif text-3xl text-ink mb-1">Eleanor Vance</h2>
        <p className="text-sm text-ink/60">Romantic Vintage Enthusiast</p>
      </div>

      <div className="flex justify-center gap-10 mb-10">
        <div className="text-center">
          <p className="text-2xl font-bold text-ink mb-1">12</p>
          <p className="text-[10px] font-bold text-ink/40 tracking-widest uppercase">Trips</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-ink mb-1">48</p>
          <p className="text-[10px] font-bold text-ink/40 tracking-widest uppercase">Saved</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-ink mb-1">15</p>
          <p className="text-[10px] font-bold text-ink/40 tracking-widest uppercase">Reviews</p>
        </div>
      </div>

      <div className="space-y-3 mb-10">
        {[
          { icon: Bookmark, label: 'Saved Aesthetics' },
          { icon: Navigation, label: 'Past Journeys' },
          { icon: Heart, label: 'Favorites' },
          { icon: CreditCard, label: 'Payment Methods' },
          { icon: Settings, label: 'Preferences & Settings' }
        ].map((item, i) => (
          <button key={i} className="w-full bg-white rounded-2xl p-5 flex items-center justify-between shadow-sm border border-ink/5 hover:border-ink/10 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-paper flex items-center justify-center">
                <item.icon className="w-5 h-5 text-ink/80" />
              </div>
              <span className="font-medium text-ink">{item.label}</span>
            </div>
            <ChevronRight className="w-5 h-5 text-ink/40" />
          </button>
        ))}
      </div>

      <button onClick={onLogout} className="w-full py-4 border border-accent/20 text-accent bg-white rounded-2xl font-bold text-sm shadow-sm hover:bg-accent/5 transition-colors">
        Log Out
      </button>
    </div>
  </motion.div>
);

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [generatedItinerary, setGeneratedItinerary] = useState<Itinerary | null>(null);

  const handleUserClick = () => {
    setActiveTab('profile');
  };

  const handleGenerate = (itinerary: Itinerary) => {
    setGeneratedItinerary(itinerary);
    setActiveTab('trip');
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-paper shadow-2xl relative font-sans text-ink overflow-x-hidden">
      <AnimatePresence mode="wait">
        {activeTab === 'home' && <HomeView key="home" onUserClick={handleUserClick} onGenerate={handleGenerate} generatedItinerary={generatedItinerary} />}
        {activeTab === 'trip' && <TripView key="trip" onUserClick={handleUserClick} itinerary={generatedItinerary} onBack={() => setActiveTab('surprise')} onUpdateItinerary={setGeneratedItinerary} />}
        {activeTab === 'surprise' && <SurpriseView key="surprise" onUserClick={handleUserClick} onGenerate={handleGenerate} />}
        {activeTab === 'message' && <MessageView key="message" onUserClick={handleUserClick} itinerary={generatedItinerary} />}
        {activeTab === 'profile' && (
          isLoggedIn ? 
            <ProfileView key="profile" onLogout={() => setIsLoggedIn(false)} onUserClick={handleUserClick} /> : 
            <AuthView key="auth" onLogin={() => setIsLoggedIn(true)} />
        )}
      </AnimatePresence>

      <BottomNav currentTab={activeTab} onNavigate={setActiveTab} />
    </div>
  );
}
