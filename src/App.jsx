import React, { useState, useEffect } from 'react';
import { ChevronLeft, Loader2, CloudUpload, CheckCircle, AlertCircle, LogOut, Share2, Mail, RefreshCw, Copy } from 'lucide-react';
import { db } from './firebase';
import { doc, setDoc, onSnapshot, collection, getDocs, query, where, orderBy, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { onAuthStateChange, completeSignIn, isAuthLink, sendVerificationEmail, logout } from './services/auth';

const INITIAL_FRAMEWORK_ID = 'initial-baseline';

export default function ProgressFramework() {
  const [data, setData] = useState(null);
  const [lastSyncedData, setLastSyncedData] = useState(null);
  const [lastSyncedName, setLastSyncedName] = useState('Post-scarcity Framework');
  const [lastFetchedAt, setLastFetchedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDomainId, setSelectedDomainId] = useState(null);
  const [hoveredDomain, setHoveredDomain] = useState(null);
  const [scaleFilter, setScaleFilter] = useState('all');
  const [saveStatus, setSaveStatus] = useState('idle');
  const [editingPractice, setEditingPractice] = useState(null);
  const [tempText, setTempText] = useState("");

  // Auth State
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [loginSent, setLoginSent] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [frameworkId, setFrameworkId] = useState(null);
  const [frameworkName, setFrameworkName] = useState('Post-scarcity Framework');
  const [ownerInfo, setOwnerInfo] = useState(null);
  const [userFrameworks, setUserFrameworks] = useState([]);
  const [sharedFrameworks, setSharedFrameworks] = useState([]);
  const [isReadOnly, setIsReadOnly] = useState(false);

  const frameworkDocRef = frameworkId ? doc(db, 'frameworks', frameworkId) : null;

  const startEditing = (domainId, index, initialText) => {
    setEditingPractice({ domainId, index });
    setTempText(initialText);
  };

  const commitEdit = () => {
    if (!editingPractice) return;
    const { domainId, index } = editingPractice;

    setData(prev => {
      const newData = JSON.parse(JSON.stringify(prev));
      if (domainId === 0) {
        newData.metaLayer.practices[index].text = tempText;
      } else {
        const domain = newData.domains.find(d => d.id === domainId);
        if (domain) domain.practices[index].text = tempText;
      }
      return newData;
    });

    setEditingPractice(null);
  };

  const cancelEdit = () => {
    setEditingPractice(null);
  };

  // 1. Auth & Share Link Handling
  useEffect(() => {
    // Check for share link in URL
    const urlParams = new URLSearchParams(window.location.search);
    const share = urlParams.get('share');
    if (share) {
      setFrameworkId(share);
      setIsReadOnly(true);
    } else {
      const lastId = window.localStorage.getItem('last_viewed_framework_id');
      setFrameworkId(lastId || INITIAL_FRAMEWORK_ID);
    }

    // Handle Auth changes
    const unsubscribe = onAuthStateChange(async (user) => {
      setUser(user);
      setAuthLoading(false);
      if (user) {
        fetchUserFrameworks(user.uid);
      }
    });

    // Handle sign-in link completion
    if (isAuthLink(window.location.href)) {
      completeSignIn(window.location.href).then(res => {
        if (res.success) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      });
    }

    // Load shared frameworks from localStorage
    const savedShared = window.localStorage.getItem('recent_shared_frameworks');
    if (savedShared) {
      setSharedFrameworks(JSON.parse(savedShared));
    }

    // Resume pending Save As after login
    if (user) {
      const pendingData = window.localStorage.getItem('pending_save_as_data');
      if (pendingData) {
        window.localStorage.removeItem('pending_save_as_data');
        window.localStorage.removeItem('pending_save_as_name');
        // Trigger handleSaveAs now that user is logged in
        handleSaveAs();
      }
    }

    return () => unsubscribe();
  }, [user]);

  const fetchUserFrameworks = async (uid) => {
    try {
      const q = query(
        collection(db, 'frameworks'),
        where('ownerId', '==', uid)
      );
      const snap = await getDocs(q);
      const frameworks = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Client-side sort
      frameworks.sort((a, b) => {
        const dateA = a.updatedAt?.toDate ? a.updatedAt.toDate() : new Date(0);
        const dateB = b.updatedAt?.toDate ? b.updatedAt.toDate() : new Date(0);
        return dateB - dateA;
      });
      setUserFrameworks(frameworks);
    } catch (err) {
      console.error("Error fetching frameworks:", err);
    }
  };

  // 2. Local Persistence (Save dirty data to localStorage)
  useEffect(() => {
    if (!data || !lastSyncedData) return;
    const isDirty = JSON.stringify(data) !== JSON.stringify(lastSyncedData);
    if (isDirty) {
      window.localStorage.setItem('pending_framework_edits', JSON.stringify(data));
    }
  }, [data, lastSyncedData]);

  // 3. Data Fetching
  useEffect(() => {
    if (!frameworkId) return;

    if (frameworkId === INITIAL_FRAMEWORK_ID) {
      fetch('/initial-data.json')
        .then(res => res.json())
        .then(json => {
          const local = window.localStorage.getItem('pending_framework_edits');
          setData(local ? JSON.parse(local) : json);
          setLastSyncedData(json);
          setLastSyncedName('Post-scarcity Framework');
          setLoading(false);
          setIsReadOnly(false);
          setOwnerInfo({ email: 'System', id: 'system' });
        });
      return;
    }

    setLoading(true);
    const unsubscribe = onSnapshot(frameworkDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const docData = snapshot.data();
        const frameworkData = docData.data;

        setFrameworkName(docData.name || 'Untitled Framework');
        setOwnerInfo({ email: docData.ownerEmail, id: docData.ownerId });

        // Determine read-only based on owner
        if (user && docData.ownerId !== user.uid) {
          setIsReadOnly(true);
        } else if (!user) {
          setIsReadOnly(true);
        } else {
          setIsReadOnly(false);
        }

        // Merge strategy for local edits if this is our target
        const local = window.localStorage.getItem('pending_framework_edits');
        const localId = window.localStorage.getItem('pending_framework_id');
        if (local && localId === frameworkId && user && docData.ownerId === user.uid) {
          setData(JSON.parse(local));
        } else {
          setData(frameworkData);
        }

        setLastSyncedData(frameworkData);
        setLastSyncedName(docData.name || 'Untitled Framework');
        setLastFetchedAt(new Date());

        // Track "Shared with Me"
        if (docData.ownerId !== user?.uid && frameworkId !== INITIAL_FRAMEWORK_ID) {
          setSharedFrameworks(prev => {
            const newItem = { id: frameworkId, name: docData.name, ownerEmail: docData.ownerEmail };
            const filtered = prev.filter(f => f.id !== frameworkId);
            const updated = [newItem, ...filtered].slice(0, 5); // Keep last 5
            window.localStorage.setItem('recent_shared_frameworks', JSON.stringify(updated));
            return updated;
          });
        }

        setLoading(false);
        setError(null);
      } else {
        // Doc doesn't exist (invalid link or deleted)
        setError("Framework not found or access denied.");
        setLoading(false);
      }
    }, (err) => {
      console.error("Firestore error:", err);
      setError("You don't have permission to view this framework.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [frameworkId, user?.uid]);

  const handleSaveToCloud = async () => {
    if (!data || !user) return;
    setSaveStatus('saving');

    let targetId = frameworkId;
    let targetName = frameworkName;

    if (frameworkId === INITIAL_FRAMEWORK_ID) {
      targetId = crypto.randomUUID();
      const userProposedName = prompt("Enter a name for your new framework:", frameworkName);
      if (!userProposedName) {
        setSaveStatus('idle');
        return;
      }
      targetName = userProposedName;
    }

    try {
      const docRef = doc(db, 'frameworks', targetId);
      const payload = {
        name: targetName,
        ownerId: user.uid,
        ownerEmail: user.email,
        updatedAt: serverTimestamp(),
        data: data
      };

      await setDoc(docRef, payload);

      setFrameworkId(targetId);
      setFrameworkName(targetName);
      window.localStorage.setItem('last_viewed_framework_id', targetId);
      setLastSyncedData(JSON.parse(JSON.stringify(data)));
      setLastSyncedName(targetName);
      window.localStorage.removeItem('pending_framework_edits');
      window.localStorage.removeItem('pending_framework_id');
      setSaveStatus('saved');
      fetchUserFrameworks(user.uid);
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      console.error("Save error detail:", err);
      setSaveStatus('error');
    }
  };

  const handleSaveAs = async () => {
    if (!data) return;

    if (!user) {
      window.localStorage.setItem('pending_save_as_data', JSON.stringify(data));
      window.localStorage.setItem('pending_save_as_name', frameworkName);
      setIsLoginModalOpen(true);
      return;
    }

    const newName = prompt("Enter a name for your copy:", `${frameworkName} (Copy)`);
    if (!newName) return;

    setSaveStatus('saving');
    const newId = crypto.randomUUID();

    try {
      const docRef = doc(db, 'frameworks', newId);
      await setDoc(docRef, {
        name: newName,
        ownerId: user.uid,
        ownerEmail: user.email,
        updatedAt: serverTimestamp(),
        data: data,
        forkedFrom: frameworkId
      });

      setFrameworkId(newId);
      setFrameworkName(newName);
      window.localStorage.setItem('last_viewed_framework_id', newId);
      setSaveStatus('saved');
      fetchUserFrameworks(user.uid);
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      console.error("Save As error:", err);
      setSaveStatus('error');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const res = await sendVerificationEmail(email);
    if (res.success) setLoginSent(true);
    else setError(res.error);
  };

  const handleLogout = async () => {
    await logout();
    window.location.reload();
  };

  const handleResetBaseline = async () => {
    if (window.confirm("This will overwrite your cloud data with the default framework. Continue?")) {
      const res = await fetch('/initial-data.json');
      const json = await res.json();
      setData(json);
      if (user && frameworkDocRef) {
        await setDoc(frameworkDocRef, {
          name: frameworkName,
          ownerId: user.uid,
          ownerEmail: user.email,
          updatedAt: serverTimestamp(),
          data: json
        });
      }
      setLastSyncedData(json);
      setLastSyncedName(frameworkName);
      window.localStorage.removeItem('pending_framework_edits');
      alert("Reset successful!");
    }
  };

  const handleShare = () => {
    if (frameworkId === INITIAL_FRAMEWORK_ID) {
      alert("Save your framework to the cloud first to get a share link!");
      return;
    }
    const url = `${window.location.origin}${window.location.pathname}?share=${frameworkId}`;
    navigator.clipboard.writeText(url);
    alert("Share URL copied to clipboard! (View-only for others)");
  };

  const handleCreateNew = () => {
    if (isDirty && !window.confirm("Discard unsaved changes and start a new framework?")) return;
    window.localStorage.removeItem('pending_framework_edits');
    window.localStorage.removeItem('pending_framework_id');
    setFrameworkId(INITIAL_FRAMEWORK_ID);
    setFrameworkName('Post-scarcity Framework');
    window.history.replaceState({}, document.title, window.location.pathname);
  };

  const handleRename = () => {
    const newName = prompt("Rename your framework:", frameworkName);
    if (newName && newName !== frameworkName) {
      setFrameworkName(newName);
      // If we are ownership-safe, sync soon
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <Loader2 className="w-12 h-12 animate-spin text-blue-500 mb-4" />
        <p className="text-slate-400 font-light tracking-widest">CONNECTING TO CLOUD...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-8 text-center">
        <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-8 max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-red-500 mb-4">Configuration Required</h2>
          <p className="text-slate-300 mb-6">{error}</p>
          <div className="text-left bg-black/40 p-4 rounded text-xs font-mono mb-6 text-slate-400">
            1. Update src/firebase.js with your config<br />
            2. Enable Firestore in Test Mode<br />
            3. Ensure Internet connection
          </div>
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
  const currentDomain = selectedDomainId === 0 ? metaLayer : domains.find(d => d.id === selectedDomainId);

  // Check for unsaved changes
  const isDirty = (JSON.stringify(data) !== JSON.stringify(lastSyncedData)) || (frameworkName !== lastSyncedName);
  const lastSyncLabel = lastFetchedAt ? `Last fetched: ${lastFetchedAt.toLocaleTimeString()}` : '';

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white overflow-hidden relative">
      {/* Sync Status Button */}
      <div className="fixed top-6 right-8 z-50 flex gap-2">
        {user && (
          <div className="flex gap-2 mr-2">
            {!isReadOnly && (
              <button
                onClick={handleShare}
                title="Copy Share URL"
                className="p-2 rounded-full bg-white/5 border border-white/20 text-white/70 hover:text-white hover:bg-white/10 transition-all"
              >
                <Share2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={handleLogout}
              title={`Sign Out (${user?.email})`}
              className="p-2 rounded-full bg-red-500/10 border border-red-500/20 text-red-400/70 hover:text-red-400 hover:bg-red-500/20 transition-all"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}

        {isReadOnly ? (
          <div className="flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-md border border-blue-500/50 bg-blue-500/10 text-blue-400" title={ownerInfo?.email ? `Author: ${ownerInfo.email}` : ''}>
            <span className="text-xs font-medium tracking-wider uppercase">Read Only</span>
            <button
              onClick={handleSaveAs}
              className="ml-2 pl-2 border-l border-blue-500/30 hover:text-white transition-colors flex items-center gap-1"
              title="Save a copy to your account"
            >
              <CloudUpload className="w-3 h-3" />
              <span className="text-[10px] font-bold">SAVE AS...</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={user ? handleSaveToCloud : () => setIsLoginModalOpen(true)}
              disabled={saveStatus === 'saving'}
              title={user ? `${lastSyncLabel} — User: ${user.email}` : 'Login required to sync to cloud'}
              className={`flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-md border transition-all duration-300 ${saveStatus === 'saved' ? 'bg-green-500/20 border-green-500 text-green-400' :
                saveStatus === 'error' ? 'bg-red-500/20 border-red-500 text-red-400' :
                  isDirty ? 'bg-amber-500/20 border-amber-500 text-amber-400 animate-pulse' :
                    'bg-white/5 border-white/20 hover:bg-white/10 text-white/70 hover:text-white'
                }`}
            >
              {saveStatus === 'saving' ? <Loader2 className="w-4 h-4 animate-spin" /> :
                saveStatus === 'saved' ? <CheckCircle className="w-4 h-4" /> :
                  saveStatus === 'error' ? <AlertCircle className="w-4 h-4" /> :
                    isDirty ? <CloudUpload className="w-4 h-4 text-amber-400" /> :
                      <CloudUpload className="w-4 h-4" />}
              <span className="text-xs font-medium tracking-wider uppercase">
                {saveStatus === 'saving' ? 'Syncing...' :
                  saveStatus === 'saved' ? 'Synced' :
                    saveStatus === 'error' ? 'Sync Failed' :
                      !user ? 'Login to Sync' :
                        isDirty ? 'Update Cloud' :
                          'Cloud Synced'}
              </span>
            </button>
            <button
              onClick={handleSaveAs}
              title="Save a copy of this framework (Save As...)"
              className="p-2 rounded-full bg-white/5 border border-white/20 text-white/70 hover:text-white hover:bg-white/10 transition-all"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

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
        {!selectedDomainId && selectedDomainId !== 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[80vh] pt-8 animate-fadeIn">
            {/* Framework Identity */}
            <div className="flex flex-col items-center mb-8 text-center">
              <div
                className={`text-xs font-medium tracking-[0.3em] uppercase mb-4 px-3 py-1 rounded-full border border-white/10 bg-white/5 ${isReadOnly ? 'text-blue-400 border-blue-500/30' : 'text-slate-500'}`}
                title={isReadOnly ? `Author: ${ownerInfo?.email}` : (user?.email || 'Guest')}
              >
                {isReadOnly ? `Shared by ${ownerInfo?.email}` : (frameworkId === INITIAL_FRAMEWORK_ID ? 'Baseline Template' : 'Your Framework')}
              </div>
              <h1
                className={`text-4xl md:text-5xl font-bold text-center outline-none ${!isReadOnly && frameworkId !== INITIAL_FRAMEWORK_ID ? 'cursor-edit hover:text-blue-400' : ''}`}
                style={{ fontFamily: 'Georgia, serif' }}
                onClick={() => !isReadOnly && frameworkId !== INITIAL_FRAMEWORK_ID && handleRename()}
              >
                {frameworkName}
              </h1>
            </div>

            {/* Collections / My Frameworks */}
            <div className="flex flex-col items-center gap-6 mb-16 px-4 w-full max-w-4xl">
              {/* My Frameworks */}
              <div className="flex flex-wrap justify-center gap-2 overflow-x-auto">
                <button
                  onClick={handleCreateNew}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-bold tracking-widest uppercase transition-all border ${frameworkId === INITIAL_FRAMEWORK_ID ? 'bg-white/20 border-white text-white' : 'bg-white/5 border-white/10 text-slate-500 hover:bg-white/10 hover:text-white'}`}
                >
                  {frameworkId === INITIAL_FRAMEWORK_ID ? '• New Framework' : '+ New'}
                </button>
                {userFrameworks.map(f => (
                  <button
                    key={f.id}
                    onClick={() => {
                      if (isDirty && !window.confirm("Switch framework and discard unsaved changes?")) return;
                      setFrameworkId(f.id);
                      window.localStorage.setItem('last_viewed_framework_id', f.id);
                      window.history.replaceState({}, document.title, window.location.pathname);
                    }}
                    className={`px-3 py-1.5 rounded-full text-[10px] font-bold tracking-widest uppercase transition-all border ${frameworkId === f.id ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'bg-white/5 border-white/10 text-slate-500 hover:bg-white/10 hover:text-white'}`}
                  >
                    {f.name}
                  </button>
                ))}
              </div>

              {/* Shared with Me / Recent */}
              {sharedFrameworks.length > 0 && (
                <div className="flex flex-col items-center gap-2">
                  <span className="text-[9px] font-bold tracking-[0.2em] text-slate-600 uppercase">Recently Viewed (Shared)</span>
                  <div className="flex flex-wrap justify-center gap-2 overflow-x-auto">
                    {sharedFrameworks.map(f => (
                      <button
                        key={f.id}
                        onClick={() => {
                          if (isDirty && !window.confirm("Switch framework and discard unsaved changes?")) return;
                          setFrameworkId(f.id);
                          window.localStorage.setItem('last_viewed_framework_id', f.id);
                          window.history.replaceState({}, document.title, `?share=${f.id}`);
                        }}
                        className={`px-3 py-1.5 rounded-full text-[10px] font-bold tracking-widest uppercase transition-all border ${frameworkId === f.id ? 'bg-purple-500/20 border-purple-500 text-purple-400' : 'bg-white/5 border-white/10 text-slate-500 hover:bg-white/10 hover:text-white'}`}
                        title={`Author: ${f.ownerEmail}`}
                      >
                        {f.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Monument Structure */}
            <div className="relative mt-8">

              {/* Pillars */}
              <div className="flex gap-0 items-end">
                {domains.map((domain, idx) => (
                  <button
                    key={domain.id}
                    onClick={() => {
                      setSelectedDomainId(domain.id);
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
                  setSelectedDomainId(0);
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
        ) : (
          /* Domain Detail View */
          <div className="animate-fadeIn">
            <button
              onClick={() => {
                setSelectedDomainId(null);
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
                  backgroundColor: `${currentDomain.color}20`,
                  border: `1px solid ${currentDomain.color}`,
                  color: currentDomain.color
                }}
              >
                {currentDomain.id === 0 ? 'Meta-Layer' : `Domain ${currentDomain.id}`}
              </div>
              <h2
                className="text-6xl font-bold mb-8 leading-tight"
                style={{
                  fontFamily: 'Georgia, serif',
                  color: currentDomain.color
                }}
              >
                {currentDomain.title}
              </h2>

              {currentDomain.id === 0 && (
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
                  ({currentDomain.practices.filter(p => p.scale === scaleFilter).length} practices)
                </span>
              )}
            </div>

            <div className="grid gap-4 max-w-4xl">
              {currentDomain.practices.map((p, i) => ({ ...p, originalIdx: i }))
                .filter(practice => scaleFilter === 'all' || practice.scale === scaleFilter)
                .map((practice) => {
                  const idx = practice.originalIdx;
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
                        borderLeftColor: currentDomain.color
                      }}
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-1"
                          style={{
                            backgroundColor: `${currentDomain.color}20`,
                            color: currentDomain.color
                          }}
                        >
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          {editingPractice?.domainId === currentDomain.id && editingPractice?.index === idx ? (
                            <textarea
                              autoFocus
                              className="w-full bg-slate-900/50 border border-blue-500/50 rounded p-2 text-lg text-slate-200 outline-none focus:border-blue-500 transition-colors mb-2 min-h-[100px]"
                              value={tempText}
                              onChange={(e) => setTempText(e.target.value)}
                              onBlur={commitEdit}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  commitEdit();
                                } else if (e.key === 'Escape') {
                                  cancelEdit();
                                }
                              }}
                            />
                          ) : (
                            <p
                              className={`text-lg text-slate-200 leading-relaxed font-light mb-2 ${isReadOnly ? '' : 'cursor-text'}`}
                              onDoubleClick={() => !isReadOnly && startEditing(currentDomain.id, idx, practice.text)}
                              title={isReadOnly ? "Read-only mode" : "Double-click to edit"}
                            >
                              {practice.text}
                            </p>
                          )}
                          <div className="flex items-center gap-2">
                            {getScaleBadge(practice.scale)}
                            {!editingPractice && !isReadOnly && (
                              <span className="text-[10px] text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                Double-click text to edit
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>

      {/* Login Modal */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setIsLoginModalOpen(false)}></div>
          <div className="bg-slate-900 border border-white/20 rounded-2xl p-8 max-w-md w-full relative z-10 animate-fadeIn">
            <button
              onClick={() => setIsLoginModalOpen(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-white"
            >
              ✕
            </button>

            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-blue-400" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Sync to Cloud</h3>
              <p className="text-slate-400 font-light">
                Sign in with your email to persist your framework and share it with others. No password needed.
              </p>
            </div>

            {!loginSent ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-widest mb-2 ml-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:border-blue-500 outline-none transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-500/20"
                >
                  Send Sign-in Link
                </button>
              </form>
            ) : (
              <div className="text-center py-4">
                <div className="animate-pulse flex flex-col items-center">
                  <CheckCircle className="w-12 h-12 text-green-500 mb-4" />
                  <p className="text-green-400 font-medium mb-2">Email Sent!</p>
                  <p className="text-slate-400 text-sm">
                    Check your inbox at <span className="text-white font-medium">{email}</span> and click the link to sign in.
                    This window can stay open; your local edits are safe.
                  </p>
                </div>
                <button
                  onClick={() => setLoginSent(false)}
                  className="mt-8 text-sm text-slate-500 hover:text-white underline underline-offset-4"
                >
                  Change email
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
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
