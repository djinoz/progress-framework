import React, { useState, useEffect } from 'react';
import { ChevronLeft, Loader2 } from 'lucide-react';

export default function ProgressFramework() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDomain, setSelectedDomain] = useState(null);
  const [hoveredDomain, setHoveredDomain] = useState(null);
  const [scaleFilter, setScaleFilter] = useState('all');

  useEffect(() => {
    fetch('/initial-data.json')
      .then(res => {
        if (!res.ok) throw new Error('Failed to load framework data');
        return res.json();
      })
      .then(json => {
        setData(json);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <Loader2 className="w-12 h-12 animate-spin text-blue-500 mb-4" />
        <p className="text-slate-400 font-light tracking-widest">INITIATING FRAMEWORK...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-8 text-center">
        <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-8 max-w-md">
          <h2 className="text-2xl font-bold text-red-500 mb-4">Connection Error</h2>
          <p className="text-slate-300 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const { metaLayer, domains } = data;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white overflow-hidden relative">
      {/* Cosmic background effects */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-20 left-20 w-96 h-96 bg-blue-500 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-pink-500 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Stars effect */}
      <div className="absolute inset-0" style={{
        backgroundImage: `radial-gradient(2px 2px at 20% 30%, white, transparent),
                         radial-gradient(2px 2px at 60% 70%, white, transparent),
                         radial-gradient(1px 1px at 50% 50%, white, transparent),
                         radial-gradient(1px 1px at 80% 10%, white, transparent),
                         radial-gradient(2px 2px at 90% 60%, white, transparent),
                         radial-gradient(1px 1px at 33% 80%, white, transparent),
                         radial-gradient(1px 1px at 15% 90%, white, transparent)`,
        backgroundSize: '200% 200%',
        backgroundPosition: '50% 50%',
        opacity: 0.4
      }}></div>

      <div className="relative z-10 max-w-7xl mx-auto px-8 py-16">
        {!selectedDomain ? (
          <>
            {/* Architectural Monument View */}
            <div className="flex flex-col items-center justify-center min-h-[80vh] pt-8">

              {/* Title */}
              <h1 className="text-4xl md:text-5xl font-bold mb-32 text-center" style={{ fontFamily: 'Georgia, serif' }}>
                Post-scarcity Framework
              </h1>

              {/* Monument Structure */}
              <div className="relative mt-8">

                {/* Pillars */}
                <div className="flex gap-0 items-end">
                  {domains.map((domain, idx) => (
                    <button
                      key={domain.id}
                      onClick={() => {
                        setSelectedDomain(domain);
                        setScaleFilter('all');
                      }}
                      onMouseEnter={() => setHoveredDomain(domain.id)}
                      onMouseLeave={() => setHoveredDomain(null)}
                      className="group relative transition-all duration-500 cursor-pointer"
                      style={{
                        width: '120px',
                        height: hoveredDomain === domain.id ? '500px' : '450px',
                        backgroundColor: `${domain.color}15`,
                        borderLeft: idx === 0 ? `3px solid ${domain.color}` : 'none',
                        borderRight: `3px solid ${domain.color}`,
                        borderTop: `3px solid ${domain.color}`,
                        borderBottom: `3px solid ${domain.color}`,
                        boxShadow: hoveredDomain === domain.id ? `0 -20px 60px ${domain.color}60` : `0 -10px 30px ${domain.color}30`
                      }}
                    >
                      {/* Glow effect */}
                      <div
                        className="absolute inset-0 opacity-0 group-hover:opacity-40 transition-opacity duration-500"
                        style={{ background: `linear-gradient(to top, ${domain.color}40, transparent)` }}
                      ></div>

                      {/* Vertical Text */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div
                          className="font-bold tracking-wider text-lg whitespace-nowrap"
                          style={{
                            writingMode: 'vertical-rl',
                            textOrientation: 'mixed',
                            transform: 'rotate(180deg)',
                            color: domain.color,
                            fontFamily: 'Georgia, serif',
                            textShadow: hoveredDomain === domain.id ? `0 0 20px ${domain.color}` : 'none'
                          }}
                        >
                          {domain.title}
                        </div>
                      </div>

                      {/* Domain number at base */}
                      <div
                        className="absolute bottom-4 left-1/2 transform -translate-x-1/2 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm"
                        style={{
                          backgroundColor: `${domain.color}30`,
                          color: domain.color,
                          border: `2px solid ${domain.color}`
                        }}
                      >
                        {domain.id}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Wisdom Slab - overlapping top of pillars */}
                <button
                  onClick={() => {
                    setSelectedDomain(metaLayer);
                    setScaleFilter('all');
                  }}
                  onMouseEnter={() => setHoveredDomain(0)}
                  onMouseLeave={() => setHoveredDomain(null)}
                  className="absolute -top-16 left-1/2 transform -translate-x-1/2 w-full transition-all duration-500 cursor-pointer group"
                  style={{
                    width: 'calc(100% + 4rem)',
                    boxShadow: hoveredDomain === 0 ? '0 0 60px rgba(251, 191, 36, 0.6)' : '0 0 30px rgba(251, 191, 36, 0.3)'
                  }}
                >
                  <div className="bg-gradient-to-r from-yellow-500/20 via-yellow-400/30 to-yellow-500/20 border-3 border-yellow-400/70 rounded-lg p-6 backdrop-blur-sm transition-all duration-500"
                    style={{
                      borderWidth: '3px',
                      transform: hoveredDomain === 0 ? 'translateY(-4px)' : 'translateY(0)'
                    }}>
                    {/* Glow effect */}
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-40 transition-opacity duration-500 rounded-lg"
                      style={{ background: 'radial-gradient(circle at center, rgba(251, 191, 36, 0.4), transparent)' }}
                    ></div>

                    <div className="relative text-center">
                      <div className="flex items-center justify-center gap-3 mb-2">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
                          style={{
                            backgroundColor: 'rgba(251, 191, 36, 0.3)',
                            color: '#fbbf24',
                            border: '2px solid #fbbf24'
                          }}
                        >
                          ∞
                        </div>
                        <h2 className="text-2xl font-bold text-yellow-200" style={{ fontFamily: 'Georgia, serif' }}>
                          {metaLayer.title}
                        </h2>
                      </div>
                      <p className="text-yellow-100/80 text-sm font-light">
                        {metaLayer.description}
                      </p>
                    </div>
                  </div>
                </button>
              </div>

              {/* Footer note */}
              <div className="mt-20 text-center">
                <p className="text-slate-400 text-sm italic">
                  As above, so below — Each domain manifests at individual and collective scales
                </p>
              </div>
            </div>
          </>
        ) : (
          /* Domain Detail View */
          <div className="animate-fadeIn">
            <button
              onClick={() => {
                setSelectedDomain(null);
                setScaleFilter('all');
              }}
              className="flex items-center gap-2 mb-12 text-slate-300 hover:text-white transition-colors group"
            >
              <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              <span className="font-light">Back to monument</span>
            </button>

            <div className="mb-12">
              <div
                className="inline-block px-6 py-2 rounded-full mb-6 font-light tracking-wider text-sm"
                style={{
                  backgroundColor: `${selectedDomain.color}20`,
                  border: `1px solid ${selectedDomain.color}`,
                  color: selectedDomain.color
                }}
              >
                {selectedDomain.id === 0 ? 'Meta-Layer' : `Domain ${selectedDomain.id}`}
              </div>
              <h2
                className="text-6xl font-bold mb-8 leading-tight"
                style={{
                  fontFamily: 'Georgia, serif',
                  color: selectedDomain.color
                }}
              >
                {selectedDomain.title}
              </h2>

              {selectedDomain.id === 0 && (
                <p className="text-slate-300 text-lg font-light mb-8 max-w-3xl">
                  The meta-layer governs all six domains below. Progress in any domain without wisdom and cosmic reciprocity becomes destructive extraction. These practices cultivate the discernment to know how, when, and whether to act.
                </p>
              )}
            </div>

            {/* Scale Filter */}
            <div className="flex gap-3 mb-8 flex-wrap items-center">
              {[
                { value: 'all', label: 'All Scales' },
                { value: 'individual', label: 'Individual', color: 'blue' },
                { value: 'collective', label: 'Collective', color: 'purple' },
                { value: 'both', label: 'Both', color: 'pink' }
              ].map(filter => (
                <button
                  key={filter.value}
                  onClick={() => setScaleFilter(filter.value)}
                  className={`px-4 py-2 rounded-full text-sm font-light transition-all duration-300 ${scaleFilter === filter.value
                      ? 'bg-white/20 border-2 border-white text-white'
                      : 'bg-white/5 border border-white/20 text-slate-400 hover:bg-white/10'
                    }`}
                >
                  {filter.label}
                </button>
              ))}
              {scaleFilter !== 'all' && (
                <span className="text-slate-400 text-sm ml-2">
                  ({selectedDomain.practices.filter(p => p.scale === scaleFilter).length} practices)
                </span>
              )}
            </div>

            <div className="grid gap-4 max-w-4xl">
              {selectedDomain.practices
                .filter(practice => scaleFilter === 'all' || practice.scale === scaleFilter)
                .map((practice, idx) => {
                  const getScaleBadge = (scale) => {
                    const configs = {
                      individual: { bg: 'bg-blue-400/20', border: 'border-blue-400', text: 'text-blue-300', label: 'Individual' },
                      collective: { bg: 'bg-purple-400/20', border: 'border-purple-400', text: 'text-purple-300', label: 'Collective' },
                      both: { bg: 'bg-gradient-to-r from-blue-400/20 to-purple-400/20', border: 'border-pink-400', text: 'text-pink-300', label: 'Both' }
                    };
                    const config = configs[scale];
                    return (
                      <span className={`px-2 py-1 rounded-full text-xs border ${config.bg} ${config.border} ${config.text} font-light`}>
                        {config.label}
                      </span>
                    );
                  };

                  return (
                    <div
                      key={idx}
                      className="group p-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl hover:bg-white/10 transition-all duration-300 hover:translate-x-2"
                      style={{
                        animationDelay: `${idx * 0.05}s`,
                        borderLeftWidth: '4px',
                        borderLeftColor: selectedDomain.color
                      }}
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-1"
                          style={{
                            backgroundColor: `${selectedDomain.color}20`,
                            color: selectedDomain.color
                          }}
                        >
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <p className="text-lg text-slate-200 leading-relaxed font-light mb-2">
                            {practice.text}
                          </p>
                          {getScaleBadge(practice.scale)}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}
