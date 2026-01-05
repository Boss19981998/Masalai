
import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, BookOpen, PlusCircle, Volume2, VolumeX, ChevronLeft, Star, Heart, Music, Trash2 } from 'lucide-react';
import { Story, AppView, StoryConfig } from './types';
import { generateStory, generateStoryImage, generateSpeech, decodeBase64, decodeAudioData } from './services/geminiService';
import { getAllStories, addStory, removeStory } from './services/dbService';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('home');
  const [stories, setStories] = useState<Story[]>([]);
  const [currentStory, setCurrentStory] = useState<Story | null>(null);
  const [loadingMsg, setLoadingMsg] = useState('Sehrli nağıl hazırlanır...');
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioSource, setAudioSource] = useState<AudioBufferSourceNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Load stories from IndexedDB on mount
  useEffect(() => {
    loadStories();
  }, []);

  const loadStories = async () => {
    try {
      const data = await getAllStories();
      setStories(data);
    } catch (err) {
      console.error("Nağılları yükləyərkən xəta:", err);
    }
  };

  const handleDeleteStory = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Bu nağılı silmək istədiyinizə əminsiniz?")) return;
    
    try {
      await removeStory(id);
      setStories(prev => prev.filter(s => s.id !== id));
      if (currentStory?.id === id) setCurrentStory(null);
    } catch (err) {
      alert("Nağılı silərkən xəta baş verdi.");
    }
  };

  const handleCreateStory = async (config: StoryConfig) => {
    setView('loading');
    setLoadingMsg('Ulduzlar bir araya gəlir, nağıl yazılır...');
    
    try {
      // 1. Generate Text
      const textData = await generateStory(config);
      setLoadingMsg('Nağıl üçün rəngarəng şəkil çəkilir...');
      
      // 2. Generate Image
      const imageUrl = await generateStoryImage(textData.title, config.theme);
      setLoadingMsg('Səsimizi hazırlayırıq...');

      // 3. Generate Audio
      const audioData = await generateSpeech(textData.content, config.language);

      const newStory: Story = {
        id: Date.now().toString(),
        title: textData.title,
        content: textData.content,
        imageUrl: imageUrl || 'https://picsum.photos/800/800?random=' + Math.random(),
        audioData,
        author: config.childName,
        createdAt: Date.now(),
        theme: config.theme
      };

      await addStory(newStory);
      setStories(prev => [newStory, ...prev]);
      setCurrentStory(newStory);
      setView('read');
    } catch (error) {
      console.error(error);
      alert("Xəta baş verdi! Yaddaş dolu ola bilər və ya şəbəkə xətası var. Yenidən yoxlayın.");
      setView('home');
    }
  };

  const stopAudio = () => {
    if (audioSource) {
      try { audioSource.stop(); } catch(e) {}
      setAudioSource(null);
    }
    setIsPlaying(false);
  };

  const playStoryAudio = async (story: Story) => {
    if (isPlaying) {
      stopAudio();
      return;
    }

    if (!story.audioData) return;

    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') await ctx.resume();

    try {
      const bytes = decodeBase64(story.audioData);
      const buffer = await decodeAudioData(bytes, ctx);
      
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.onended = () => setIsPlaying(false);
      
      source.start(0);
      setAudioSource(source);
      setIsPlaying(true);
    } catch (err) {
      console.error("Səs xətası:", err);
      setIsPlaying(false);
    }
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-amber-50 shadow-xl flex flex-col relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-yellow-200 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
      <div className="absolute top-1/2 -left-20 w-60 h-60 bg-pink-100 rounded-full blur-3xl opacity-50 pointer-events-none"></div>

      {/* Header */}
      {view !== 'loading' && (
        <header className="px-6 pt-8 pb-4 flex justify-between items-center z-10">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => { stopAudio(); setView('home'); }}>
            <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg transform -rotate-6">
              <Sparkles className="text-white w-6 h-6" />
            </div>
            <h1 className="text-2xl title-font text-indigo-900 tracking-tight">Masal Dünyası</h1>
          </div>
          {view === 'read' && (
            <button 
              onClick={() => { stopAudio(); setView('home'); }}
              className="p-2 bg-white rounded-full shadow-md text-indigo-600 hover:scale-110 transition-transform"
            >
              <ChevronLeft size={24} />
            </button>
          )}
        </header>
      )}

      {/* Main Content Area */}
      <main className="flex-1 px-6 pb-24 z-10 overflow-y-auto">
        {view === 'home' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <section className="bg-indigo-600 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
              <div className="relative z-10">
                <h2 className="text-xl font-bold mb-2">Salam, balaca qəhrəman! 👋</h2>
                <p className="opacity-90 mb-4 text-sm">Bu gün hansı nağılda baş qəhrəman olmaq istəyirsən?</p>
                <button 
                  onClick={() => setView('create')}
                  className="bg-white text-indigo-600 px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg active:scale-95 transition-all"
                >
                  <PlusCircle size={20} />
                  Yeni Nağıl Yarat
                </button>
              </div>
              <Music className="absolute -bottom-4 -right-4 w-24 h-24 opacity-10 rotate-12" />
            </section>

            <div>
              <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
                <BookOpen size={20} className="text-amber-500" />
                Mənim Nağıllarım
              </h3>
              
              {stories.length === 0 ? (
                <div className="text-center py-12 bg-white/50 rounded-3xl border-2 border-dashed border-indigo-200">
                  <p className="text-slate-400 text-sm">Hələ heç bir nağılın yoxdur.<br/>Gəl birlikdə yaradaq!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {stories.map(story => (
                    <div 
                      key={story.id}
                      onClick={() => { setCurrentStory(story); setView('read'); }}
                      className="bg-white p-3 rounded-2xl shadow-sm flex gap-4 cursor-pointer hover:shadow-md transition-all group relative border border-transparent hover:border-indigo-100"
                    >
                      <img src={story.imageUrl} className="w-20 h-20 rounded-xl object-cover" alt={story.title} />
                      <div className="flex flex-col justify-center overflow-hidden flex-1">
                        <h4 className="font-bold text-slate-800 truncate">{story.title}</h4>
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <Star size={12} className="text-yellow-400 fill-yellow-400" />
                          {story.author} üçün • {story.theme}
                        </p>
                      </div>
                      <button 
                        onClick={(e) => handleDeleteStory(e, story.id)}
                        className="opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-red-400 transition-all rounded-full hover:bg-red-50"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {view === 'create' && (
          <div className="animate-in zoom-in-95 duration-300">
             <StoryForm onSubmit={handleCreateStory} onCancel={() => setView('home')} />
          </div>
        )}

        {view === 'read' && currentStory && (
          <div className="space-y-6 animate-in fade-in duration-700">
            <div className="relative">
              <img src={currentStory.imageUrl} className="w-full aspect-square rounded-[2.5rem] shadow-2xl object-cover" alt={currentStory.title} />
              <button 
                onClick={() => playStoryAudio(currentStory)}
                className={`absolute bottom-6 right-6 p-5 rounded-full shadow-2xl transform active:scale-90 transition-all ${isPlaying ? 'bg-red-500 text-white animate-pulse' : 'bg-indigo-600 text-white'}`}
              >
                {isPlaying ? <VolumeX size={32} /> : <Volume2 size={32} />}
              </button>
            </div>
            
            <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-indigo-50">
              <h2 className="text-2xl title-font text-indigo-900 mb-4">{currentStory.title}</h2>
              <p className="text-slate-700 leading-relaxed whitespace-pre-line text-lg font-medium">
                {currentStory.content}
              </p>
              <div className="mt-8 pt-6 border-t border-slate-100 flex justify-between items-center">
                <span className="text-xs text-slate-400 italic">Müəllif: Sehrli AI</span>
                <Heart size={20} className="text-pink-400 fill-pink-400" />
              </div>
            </div>
          </div>
        )}

        {view === 'loading' && (
          <div className="h-[60vh] flex flex-col items-center justify-center text-center px-8 space-y-8">
            <div className="relative">
              <div className="w-32 h-32 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
              <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-amber-500 w-12 h-12" />
            </div>
            <p className="text-xl font-bold text-indigo-900 animate-pulse">{loadingMsg}</p>
          </div>
        )}
      </main>

      {/* Persistent Bottom Nav (Simplified) */}
      {view === 'home' && (
        <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-sm bg-white/80 backdrop-blur-md rounded-3xl p-4 flex justify-around shadow-2xl z-50 border border-white">
          <button className="flex flex-col items-center gap-1 text-indigo-600">
            <BookOpen size={24} />
            <span className="text-[10px] font-bold">Nağıllarım</span>
          </button>
          <button 
            onClick={() => setView('create')}
            className="bg-indigo-600 text-white p-4 rounded-2xl shadow-lg -mt-8 transform hover:scale-110 active:scale-95 transition-all"
          >
            <PlusCircle size={32} />
          </button>
          <button className="flex flex-col items-center gap-1 text-slate-400 grayscale">
            <Star size={24} />
            <span className="text-[10px] font-bold">Sehrli Yer</span>
          </button>
        </nav>
      )}
    </div>
  );
};

const StoryForm: React.FC<{ onSubmit: (config: StoryConfig) => void, onCancel: () => void }> = ({ onSubmit, onCancel }) => {
  const [name, setName] = useState('');
  const [theme, setTheme] = useState('Kosmos Macərası');
  const [moral, setMoral] = useState('Dostluğun önəmi');
  const [lang, setLang] = useState<'az' | 'tr'>('az');

  const themes = ['Kosmos Macərası', 'Sehrli Meşə', 'Dinozavrlar Dünyası', 'Şahzadə və Əjdaha', 'Danışan Heyvanlar'];
  const morals = ['Dostluğun önəmi', 'Dürüstlük', 'Cəsarətli olmaq', 'Təbiəti qorumaq', 'Paylaşmaq gözəldir'];

  return (
    <div className="space-y-6 bg-white p-6 rounded-3xl shadow-lg border border-indigo-50">
      <h2 className="text-xl font-bold text-indigo-900 flex items-center gap-2">
        <Sparkles className="text-amber-500" />
        Nağılın Detalları
      </h2>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Uşağın Adı</label>
          <input 
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Məsələn: Leyla"
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nağılın Mövzusu</label>
          <div className="flex flex-wrap gap-2">
            {themes.map(t => (
              <button 
                key={t}
                onClick={() => setTheme(t)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${theme === t ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nağılın Dərsi</label>
          <select 
            value={moral}
            onChange={e => setMoral(e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none"
          >
            {morals.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Dil</label>
          <div className="flex gap-4">
            <button 
              onClick={() => setLang('az')}
              className={`flex-1 py-3 rounded-2xl font-bold border-2 transition-all ${lang === 'az' ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-200 text-slate-400'}`}
            >
              🇦🇿 Azərbaycanca
            </button>
            <button 
              onClick={() => setLang('tr')}
              className={`flex-1 py-3 rounded-2xl font-bold border-2 transition-all ${lang === 'tr' ? 'border-red-600 bg-red-50 text-red-600' : 'border-slate-200 text-slate-400'}`}
            >
              🇹🇷 Türkçe
            </button>
          </div>
        </div>
      </div>

      <div className="pt-4 space-y-3">
        <button 
          onClick={() => name && onSubmit({ childName: name, theme, moral, language: lang })}
          disabled={!name}
          className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold shadow-xl active:scale-95 disabled:opacity-50 disabled:active:scale-100 transition-all flex items-center justify-center gap-2"
        >
          <Sparkles size={20} />
          Sehrli Nağılı Yarat
        </button>
        <button 
          onClick={onCancel}
          className="w-full text-slate-400 font-bold py-2"
        >
          Geri Qayıt
        </button>
      </div>
    </div>
  );
};

export default App;
