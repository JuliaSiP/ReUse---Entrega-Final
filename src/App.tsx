/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { auth, db, testConnection, signInWithEmailAndPassword, createUserWithEmailAndPassword } from './lib/firebase';
import { onAuthStateChanged, User, updateProfile } from 'firebase/auth';
import { collection, query, where, onSnapshot, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { 
  Recycle, 
  Search, 
  Plus, 
  MessageSquare, 
  User as UserIcon, 
  Trophy, 
  Leaf,
  LogOut,
  ShoppingBag,
  ArrowRightLeft,
  Mail,
  Lock,
  User as UserLucide
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { getChatReply } from './services/gemini';

// --- Types ---
interface DbUser {
  uid: string;
  name: string;
  email: string;
  photoURL: string;
  points: number;
  level: number;
  bio: string;
  location?: { lat: number, lng: number };
}

interface Item {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  category: string;
  condition: string;
  images: string[];
  status: string;
  pointsValue: number;
  location?: { lat: number, lng: number };
  distance?: number;
  createdAt: any;
}

const CATEGORIES = ['Tudo', 'Eletrônicos', 'Móveis', 'Livros', 'Vestuário', 'Esportes', 'Ferramentas', 'Decoração'];

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [dbUser, setDbUser] = useState<DbUser | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [view, setView] = useState<'home' | 'discover' | 'my-items' | 'exchanges' | 'profile' | 'rewards'>('home');
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'model', text: string }[]>([]);
  const [aiInput, setAiInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isCreateItemOpen, setIsCreateItemOpen] = useState(false);
  const [newItem, setNewItem] = useState({ title: '', description: '', category: 'Geral', condition: 'New', pointsValue: 10 });
  const [selectedCategory, setSelectedCategory] = useState('Tudo');
  const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    testConnection();
    
    // Get geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => setUserLocation({ lat: -23.5505, lng: -46.6333 }) // Default to São Paulo
      );
    }
  }, []);

  useEffect(() => {
    // Populate demo items if none exist
    const demoItems: Item[] = [
      { id: '1', ownerId: 'demo1', title: 'Monitor Dell 24"', description: 'Excelente estado, 75Hz.', category: 'Eletrônicos', condition: 'Like New', pointsValue: 150, status: 'available', images: [], createdAt: null, distance: 1.2 },
      { id: '2', ownerId: 'demo2', title: 'Cadeira de Escritório', description: 'Ergonômica, regulável.', category: 'Móveis', condition: 'Good', pointsValue: 100, status: 'available', images: [], createdAt: null, distance: 2.5 },
      { id: '3', ownerId: 'demo3', title: 'Livro: O Hobbit', description: 'Edição de colecionador.', category: 'Livros', condition: 'New', pointsValue: 20, status: 'available', images: [], createdAt: null, distance: 0.8 },
      { id: '4', ownerId: 'demo4', title: 'Jaqueta de Couro', description: 'Tamanho G, preta.', category: 'Vestuário', condition: 'Good', pointsValue: 80, status: 'available', images: [], createdAt: null, distance: 3.4 },
    ];
    setItems(demoItems);
  }, []);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return parseFloat((R * c).toFixed(1));
  };

  const handleCreateItem = async () => {
    if (!user || !newItem.title) return;
    try {
      const itemsRef = collection(db, 'items');
      const itemData = {
        ...newItem,
        ownerId: user.uid,
        status: 'available',
        images: [],
        createdAt: serverTimestamp(),
        location: userLocation
      };
      // In demo mode we still try to save to DB if connected, but we also update local state
      try {
        await setDoc(doc(itemsRef), itemData);
      } catch (err) {
        console.warn("DB write failed in demo mode, but that's okay.");
      }
      
      const newItemWithId = { id: Math.random().toString(36).substr(2, 9), ...itemData, distance: 0 } as Item;
      setItems(prev => [newItemWithId, ...prev]);
      setIsCreateItemOpen(false);
      setNewItem({ title: '', description: '', category: 'Geral', condition: 'New', pointsValue: 10 });
    } catch (err) {
      console.error(err);
    }
  };

  const filteredItems = items.filter(item => 
    selectedCategory === 'Tudo' || item.category === selectedCategory
  );

  const handleAiSend = async () => {
    if (!aiInput.trim()) return;
    const newMessage = { role: 'user' as const, text: aiInput };
    setChatMessages(prev => [...prev, newMessage]);
    setAiInput('');
    setIsAiLoading(true);
    try {
      const reply = await getChatReply(aiInput, []);
      setChatMessages(prev => [...prev, { role: 'model', text: reply || 'Não entendi seu pedido.' }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'model', text: 'Desculpe, tive um erro ao processar sua mensagem.' }]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    // DEMO MODE: Simply set a mock user and move forward
    const mockUser = {
      uid: 'demo_user_123',
      displayName: name || 'Visitante',
      email: email || 'demo@reuse.com',
      photoURL: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${name || 'demo'}`
    };

    const mockDbUser: DbUser = {
      uid: mockUser.uid,
      name: mockUser.displayName,
      email: mockUser.email,
      photoURL: mockUser.photoURL,
      points: 450,
      level: 4,
      bio: 'Sou um usuário entusiasta da sustentabilidade urbana!'
    };

    setUser(mockUser as any);
    setDbUser(mockDbUser);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#f5f5f0] flex flex-col items-center justify-center p-6 text-[#1a1a1a]">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white rounded-[32px] p-8 shadow-xl text-center space-y-6"
        >
          <div className="flex justify-center">
            <div className="p-4 bg-[#5A5A40] rounded-full text-white">
              <Recycle size={48} />
            </div>
          </div>
          
          <div className="space-y-2">
            <h1 className="text-4xl font-serif font-light leading-tight">ReUse</h1>
            <p className="text-[#5A5A40] font-medium tracking-wide uppercase text-[10px]">
              Sustentabilidade Urbana & Consumo Consciente
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4 text-left">
            {isRegistering && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-gray-400 ml-4">Nome Completo</label>
                <div className="relative">
                  <UserLucide className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="text" 
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Seu nome"
                    className="w-full bg-[#f5f5f0] rounded-full py-3 pl-12 pr-4 outline-none focus:ring-2 focus:ring-[#5A5A40]/20"
                  />
                </div>
              </div>
            )}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-gray-400 ml-4">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="email" 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="exemplo@email.com"
                  className="w-full bg-[#f5f5f0] rounded-full py-3 pl-12 pr-4 outline-none focus:ring-2 focus:ring-[#5A5A40]/20"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-gray-400 ml-4">Senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="password" 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#f5f5f0] rounded-full py-3 pl-12 pr-4 outline-none focus:ring-2 focus:ring-[#5A5A40]/20"
                />
              </div>
            </div>

            {authError && (
              <p className="text-red-500 text-xs text-center font-medium">{authError}</p>
            )}

            <button 
              type="submit"
              className="w-full bg-[#1a1a1a] text-white rounded-full py-4 font-medium transition-all hover:bg-[#333] hover:scale-[1.02] active:scale-[0.98] shadow-lg"
            >
              {isRegistering ? 'Criar Conta' : 'Entrar'}
            </button>
          </form>

          <p className="text-gray-500 text-sm">
            {isRegistering ? 'Já tem uma conta?' : 'Ainda não tem conta?'} 
            <button 
              onClick={() => {
                setIsRegistering(!isRegistering);
                setAuthError('');
              }}
              className="text-[#5A5A40] font-bold ml-1 hover:underline"
            >
              {isRegistering ? 'Faça Login' : 'Cadastre-se'}
            </button>
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f0] text-[#1a1a1a] font-sans">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md z-40 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('home')}>
            <div className="p-2 bg-[#5A5A40] rounded-lg text-white">
              <Recycle size={24} />
            </div>
            <span className="text-2xl font-serif font-bold tracking-tight">ReUse</span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium">
            <NavButton active={view === 'home'} onClick={() => setView('home')}>Início</NavButton>
            <NavButton active={view === 'discover'} onClick={() => setView('discover')}>Explorar</NavButton>
            <NavButton active={view === 'my-items'} onClick={() => setView('my-items')}>Meus Itens</NavButton>
            <NavButton active={view === 'exchanges'} onClick={() => setView('exchanges')}>Trocas</NavButton>
            <NavButton active={view === 'rewards'} onClick={() => setView('rewards')}>Pontos</NavButton>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Nível {dbUser?.level}</span>
              <div className="flex items-center gap-1 text-[#5A5A40]">
                <Leaf size={14} fill="currentColor" />
                <span className="font-mono font-bold">{dbUser?.points}</span>
              </div>
            </div>
            <button 
              onClick={() => setView('profile')}
              className="w-10 h-10 rounded-full border-2 border-[#5A5A40] p-0.5 hover:scale-110 transition-transform overflow-hidden"
            >
              <img src={dbUser?.photoURL || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${user.uid}`} alt="" className="w-full h-full rounded-full object-cover" />
            </button>
            <button onClick={() => auth.signOut()} className="text-gray-400 hover:text-red-500 transition-colors">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-28 pb-12 px-6 max-w-7xl mx-auto">
        <AnimatePresence mode="wait">
          {view === 'home' && (
            <motion.div 
              key="home"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-12"
            >
              {/* Hero */}
              <section className="bg-[#1a1a1a] rounded-[40px] p-12 text-white relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:scale-110 transition-transform duration-1000">
                  <Recycle size={300} strokeWidth={0.5} />
                </div>
                <div className="relative z-10 max-w-2xl space-y-6">
                  <h2 className="text-5xl font-serif leading-[1.1]">Economia Circular no seu Bairro</h2>
                  <p className="text-xl text-gray-400 font-light leading-relaxed">
                    A cada troca, um item deixa de ser lixo e vira valor. Comece hoje sua jornada rumo a um futuro mais consciente.
                  </p>
                  <div className="flex gap-4 pt-4">
                    <button 
                      onClick={() => setView('discover')}
                      className="bg-white text-black px-8 py-4 rounded-full font-medium flex items-center gap-2 hover:bg-[#f0f0f0] transition-colors"
                    >
                      Começar a Trocar <ShoppingBag size={20} />
                    </button>
                    <button className="border border-white/30 text-white px-8 py-4 rounded-full font-medium hover:bg-white/10 transition-colors">
                      Como Funciona?
                    </button>
                  </div>
                </div>
              </section>

              {/* Stats/Gamification */}
              <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard 
                  icon={<Trophy className="text-yellow-600" />}
                  title="Ranking Semanal"
                  value="#12"
                  label="Entre os top moradores"
                />
                <StatCard 
                  icon={<Leaf className="text-green-600" />}
                  title="Impacto Ambiental"
                  value="12.4kg"
                  label="CO2 economizado"
                />
                <StatCard 
                  icon={<ArrowRightLeft className="text-blue-600" />}
                  title="Trocas Realizadas"
                  value="5"
                  label="Este mês"
                />
              </section>

              {/* Featured Items */}
              <section className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-serif">Itens Populares Perto de Você</h3>
                  <button onClick={() => setView('discover')} className="text-sm font-bold text-[#5A5A40] hover:underline uppercase tracking-tight">Ver Tudo</button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {items.slice(0, 4).map(item => (
                    <ItemCard key={item.id} item={item} />
                  ))}
                  {items.length === 0 && (
                    <div className="col-span-full py-12 text-center text-gray-400 space-y-2">
                      <ShoppingBag className="mx-auto" size={48} />
                      <p>Nenhum item disponível no momento.</p>
                    </div>
                  )}
                </div>
              </section>
            </motion.div>
          )}

          {view === 'discover' && (
            <motion.div 
              key="discover"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-10"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <h2 className="text-4xl font-serif">Explorar</h2>
                <div className="relative max-w-md w-full">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="O que você está procurando?" 
                    className="w-full bg-white border border-gray-200 rounded-full py-3 pl-12 pr-4 focus:ring-2 focus:ring-[#5A5A40]/20 outline-none"
                  />
                </div>
              </div>

              {/* Category Filter */}
              <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar">
                {CATEGORIES.map(cat => (
                  <button 
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={cn(
                      "px-6 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                      selectedCategory === cat 
                        ? "bg-[#5A5A40] text-white shadow-lg" 
                        : "bg-white text-gray-500 hover:bg-gray-100"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {filteredItems.map(item => (
                  <ItemCard key={item.id} item={item} />
                ))}
                {filteredItems.length === 0 && (
                  <div className="col-span-full py-20 text-center text-gray-400 space-y-4">
                    <Search className="mx-auto" size={48} />
                    <p className="text-lg">Ops! Nenhum item encontrado nesta categoria.</p>
                    <button onClick={() => setSelectedCategory('Tudo')} className="text-[#5A5A40] font-bold underline">Limpar Filtros</button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {view === 'rewards' && (
            <motion.div 
              key="rewards"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-12"
            >
              {/* Header / Level Progress */}
              <section className="bg-[#5A5A40] rounded-[40px] p-12 text-white flex flex-col md:flex-row items-center gap-12">
                <div className="relative">
                  <div className="w-32 h-32 rounded-full border-4 border-white/20 flex items-center justify-center">
                    <Trophy size={48} className="text-yellow-400" />
                  </div>
                  <div className="absolute -bottom-2 -right-2 bg-white text-black w-10 h-10 rounded-full flex items-center justify-center font-bold">
                    {dbUser?.level}
                  </div>
                </div>
                <div className="flex-1 space-y-4 text-center md:text-left">
                  <h2 className="text-4xl font-serif">Sua Jornada Sustentável</h2>
                  <p className="text-white/70">Você está no Nível {dbUser?.level}. Continue trocando para desbloquear novos benefícios!</p>
                  <div className="w-full bg-white/10 h-3 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(dbUser?.points || 0) % 100}%` }}
                      className="h-full bg-yellow-400"
                    />
                  </div>
                  <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-white/50">
                    <span>Nível {dbUser?.level}</span>
                    <span>{100 - ((dbUser?.points || 0) % 100)} pontos para o Nível {(dbUser?.level || 1) + 1}</span>
                  </div>
                </div>
                <div className="bg-white/10 backdrop-blur rounded-[32px] p-8 text-center min-w-[180px]">
                  <span className="text-xs font-bold uppercase tracking-wider text-white/50">Saldo Atual</span>
                  <div className="text-5xl font-mono font-bold mt-1">{dbUser?.points}</div>
                  <div className="flex items-center justify-center gap-1 mt-2 text-yellow-400">
                    <Leaf size={14} fill="currentColor" />
                    <span className="text-xs font-bold uppercase">Pontos Eco</span>
                  </div>
                </div>
              </section>

              {/* Rewards Items */}
              <section className="space-y-8">
                <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                  <div className="space-y-2">
                    <h3 className="text-3xl font-serif">Trocar Pontos por Benefícios</h3>
                    <p className="text-gray-500">Parceiros que acreditam em um futuro sustentável.</p>
                  </div>
                  <div className="flex gap-2">
                    <span className="px-4 py-2 bg-white border border-gray-200 rounded-full text-xs font-bold uppercase">Transparência Digital</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <RewardCard 
                    title="Voucher Horta Urbana" 
                    provider="Fazenda do Bairro" 
                    cost={150} 
                    image="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=400"
                    description="10% de desconto em qualquer cesta de produtos orgânicos colhidos no dia."
                  />
                  <RewardCard 
                    title="Crédito Mobilidade" 
                    provider="EcoBike Share" 
                    cost={80} 
                    image="https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&q=80&w=400"
                    description="2 horas de uso gratuito de bicicletas elétricas em qualquer estação da cidade."
                  />
                  <RewardCard 
                    title="Workshop Reciclagem" 
                    provider="Oficina Maker" 
                    cost={200} 
                    image="https://images.unsplash.com/photo-1530124560676-4fbc91abc6f2?auto=format&fit=crop&q=80&w=400"
                    description="Inscrição gratuita para o workshop presencial de upcycling de eletrônicos."
                  />
                  <RewardCard 
                    title="Voucher Brechó" 
                    provider="Second Hand Club" 
                    cost={120} 
                    image="https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&q=80&w=400"
                    description="Cupom de R$ 30,00 válido para compras acima de R$ 100,00."
                  />
                  <RewardCard 
                    title="Café Ecológico" 
                    provider="Grão Sustentável" 
                    cost={50} 
                    image="https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&q=80&w=400"
                    description="Um café espresso grátis ao levar sua própria caneca reutilizável."
                  />
                  <RewardCard 
                    title="Plantio de Árvore" 
                    provider="SOS Mata Atlântica" 
                    cost={500} 
                    image="https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&q=80&w=400"
                    description="Nós plantamos uma árvore em seu nome e enviamos o certificado digital."
                  />
                </div>
              </section>

              {/* Achievements */}
              <section className="bg-white rounded-[40px] p-12 space-y-8">
                <h3 className="text-2xl font-serif">Suas Conquistas</h3>
                <div className="flex flex-wrap gap-6">
                  <Badge icon={<Recycle size={20} />} title="Primeira Troca" description="Iniciou sua jornada circular" active={true} />
                  <Badge icon={<MessageSquare size={20} />} title="Comunicador" description="Manteve chats ativos por 7 dias" active={true} />
                  <Badge icon={<Leaf size={20} />} title="Eco Guardião" description="Economizou 10kg de CO2" active={false} />
                  <Badge icon={<Trophy size={20} />} title="Doador de Elite" description="Anunciou 5 itens em um mês" active={false} />
                </div>
              </section>
            </motion.div>
          )}

          {view === 'profile' && (
            <motion.div 
              key="profile"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="max-w-2xl mx-auto bg-white rounded-[40px] p-12 shadow-sm space-y-8"
            >
               <div className="flex items-center gap-6">
                 <img src={dbUser?.photoURL || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${user.uid}`} className="w-24 h-24 rounded-[32px] object-cover border-4 border-[#f5f5f0]" />
                 <div>
                   <h2 className="text-3xl font-serif">{dbUser?.name}</h2>
                   <p className="text-gray-500">{dbUser?.email}</p>
                 </div>
               </div>
               <div className="h-px bg-gray-100" />
               <div className="grid grid-cols-2 gap-4">
                 <div className="bg-[#f5f5f0] p-6 rounded-3xl text-center">
                    <span className="text-gray-400 text-xs uppercase font-bold">Nível Sustentável</span>
                    <div className="text-3xl font-serif mt-1">{dbUser?.level}</div>
                 </div>
                 <div className="bg-[#f5f5f0] p-6 rounded-3xl text-center">
                    <span className="text-gray-400 text-xs uppercase font-bold">Pontos ReUse</span>
                    <div className="text-3xl font-serif mt-1 text-[#5A5A40]">{dbUser?.points}</div>
                 </div>
               </div>
               <div className="space-y-2">
                 <label className="text-xs font-bold uppercase text-gray-400">Bio</label>
                 <textarea 
                   className="w-full bg-[#f5f5f0] rounded-[24px] p-6 outline-none focus:ring-2 focus:ring-[#5A5A40]/10 min-h-[120px] resize-none"
                   placeholder="Conte um pouco sobre suas motivações para trocar..."
                   defaultValue={dbUser?.bio}
                 />
               </div>
               <button className="w-full bg-[#5A5A40] text-white py-4 rounded-full font-medium hover:opacity-90 transition-opacity">
                 Atualizar Perfil
               </button>

               <div className="pt-8 border-t border-dashed border-gray-200 space-y-4">
                  <p className="text-xs font-bold uppercase text-gray-400 text-center">Área do Desenvolvedor (Demo)</p>
                  <button 
                    onClick={seedDemoData}
                    className="w-full border-2 border-[#5A5A40] text-[#5A5A40] py-3 rounded-full font-bold hover:bg-[#5A5A40] hover:text-white transition-all flex items-center justify-center gap-2"
                  >
                    Popular Banco com Itens de Demo <Plus size={18} />
                  </button>
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Create Item Modal */}
      <AnimatePresence>
        {isCreateItemOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreateItemOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-md z-50"
            />
            <motion.div 
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="fixed inset-x-6 top-20 bottom-20 md:inset-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-xl bg-white rounded-[40px] shadow-2xl z-50 overflow-y-auto p-12 space-y-8"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-3xl font-serif">Anunciar Item</h2>
                <button onClick={() => setIsCreateItemOpen(false)} className="text-gray-400 hover:text-black">
                  <Plus className="rotate-45" size={32} />
                </button>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-gray-400">Título do Produto</label>
                  <input 
                    type="text" 
                    value={newItem.title}
                    onChange={e => setNewItem({...newItem, title: e.target.value})}
                    placeholder="Ex: Livro de Arte, Bicicleta Usada..." 
                    className="w-full bg-[#f5f5f0] rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-[#5A5A40]/20"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-gray-400">Categoria</label>
                  <select 
                    value={newItem.category}
                    onChange={e => setNewItem({...newItem, category: e.target.value})}
                    className="w-full bg-[#f5f5f0] rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-[#5A5A40]/20 appearance-none"
                  >
                    {CATEGORIES.filter(c => c !== 'Tudo').map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-gray-400">Condição</label>
                  <select 
                    value={newItem.condition}
                    onChange={e => setNewItem({...newItem, condition: e.target.value})}
                    className="w-full bg-[#f5f5f0] rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-[#5A5A40]/20 appearance-none"
                  >
                    <option value="New">Novo</option>
                    <option value="Like New">Como Novo</option>
                    <option value="Good">Bom Estado</option>
                    <option value="Fair">Marcas de Uso</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-gray-400">Valor em Pontos (Sugerido)</label>
                  <input 
                    type="number" 
                    value={newItem.pointsValue}
                    onChange={e => setNewItem({...newItem, pointsValue: parseInt(e.target.value)})}
                    className="w-full bg-[#f5f5f0] rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-[#5A5A40]/20"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-gray-400">Descrição</label>
                  <textarea 
                    value={newItem.description}
                    onChange={e => setNewItem({...newItem, description: e.target.value})}
                    placeholder="Descreva o estado do item..."
                    className="w-full bg-[#f5f5f0] rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-[#5A5A40]/20 min-h-[100px] resize-none"
                  />
                </div>
              </div>

              <button 
                onClick={handleCreateItem}
                className="w-full bg-[#5A5A40] text-white py-4 rounded-full font-bold shadow-lg hover:opacity-90 transition-all flex items-center justify-center gap-2"
              >
                Publicar Agora <Leaf size={20} />
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Floating Action Button - Create Item */}
      <button 
        onClick={() => setIsCreateItemOpen(true)} 
        className="fixed bottom-8 right-8 w-16 h-16 bg-[#5A5A40] text-white rounded-2xl shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-30"
      >
        <Plus size={32} />
      </button>

      {/* Chatbot Toggle */}
      <button 
        onClick={() => setIsAiOpen(true)}
        className="fixed bottom-8 left-8 w-14 h-14 bg-white border border-gray-200 text-[#1a1a1a] rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-all z-30"
      >
        <MessageSquare size={24} />
      </button>

      {/* Chatbot Overlay */}
      <AnimatePresence>
        {isAiOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAiOpen(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50"
            />
            <motion.div 
              initial={{ opacity: 0, x: -100, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -100, scale: 0.9 }}
              className="fixed bottom-8 left-8 w-full max-w-md h-[600px] bg-white rounded-[32px] shadow-2xl z-50 overflow-hidden flex flex-col"
            >
              <div className="p-6 bg-[#1a1a1a] text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#5A5A40] rounded-lg flex items-center justify-center">
                    <Leaf size={16} />
                  </div>
                  <div>
                    <h4 className="font-serif font-bold">EcoBot</h4>
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest">Sua IA Sustentável</p>
                  </div>
                </div>
                <button onClick={() => setIsAiOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                  <Plus className="rotate-45" size={24} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {chatMessages.length === 0 && (
                  <div className="text-center py-12 space-y-4">
                    <p className="text-sm text-gray-400">Olá! Eu sou o EcoBot. Como posso te ajudar hoje?</p>
                    <div className="flex flex-wrap justify-center gap-2">
                       <SuggestionChip text="Como trocar?" onClick={() => setAiInput('Como funcionam as trocas?')} />
                       <SuggestionChip text="Dicas de reciclagem" onClick={() => setAiInput('Me dê dicas de reciclagem urbana')} />
                       <SuggestionChip text="O que é ReUse?" onClick={() => setAiInput('O que é a plataforma ReUse?')} />
                    </div>
                  </div>
                )}
                {chatMessages.map((msg, i) => (
                  <div key={i} className={cn(
                    "max-w-[80%] rounded-[20px] p-4 text-sm leading-relaxed",
                    msg.role === 'user' ? "bg-[#1a1a1a] text-white ml-auto rounded-tr-none" : "bg-[#f5f5f0] text-[#1a1a1a] mr-auto rounded-tl-none"
                  )}>
                    {msg.text}
                  </div>
                ))}
                {isAiLoading && (
                  <div className="bg-[#f5f5f0] text-gray-400 rounded-[20px] px-4 py-2 w-16 flex gap-1 animate-pulse">
                    <div className="w-1 h-1 bg-gray-400 rounded-full" />
                    <div className="w-1 h-1 bg-gray-400 rounded-full" />
                    <div className="w-1 h-1 bg-gray-400 rounded-full" />
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-gray-100 flex gap-2">
                <input 
                  type="text" 
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAiSend()}
                  placeholder="Pergunte ao EcoBot..."
                  className="flex-1 bg-[#f5f5f0] rounded-full px-6 py-3 outline-none focus:ring-2 focus:ring-[#5A5A40]/20 text-sm"
                />
                <button 
                  onClick={handleAiSend}
                  disabled={isAiLoading || !aiInput.trim()}
                  className="bg-[#1a1a1a] text-white p-3 rounded-full hover:scale-110 active:scale-95 transition-all disabled:opacity-50"
                >
                   <ArrowRightLeft size={20} className="rotate-45" />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Helper Components ---

function NavButton({ children, active, onClick }: { children: React.ReactNode, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "relative py-2 transition-colors",
        active ? "text-[#1a1a1a]" : "text-gray-400 hover:text-gray-600"
      )}
    >
      {children}
      {active && (
        <motion.div 
          layoutId="nav-underline"
          className="absolute -bottom-1 left-0 right-0 h-0.5 bg-[#5A5A40]"
        />
      )}
    </button>
  );
}

function StatCard({ icon, title, value, label }: { icon: React.ReactNode, title: string, value: string, label: string }) {
  return (
    <div className="bg-white p-8 rounded-[32px] shadow-sm space-y-4 border border-gray-50">
      <div className="w-12 h-12 bg-[#f5f5f0] rounded-2xl flex items-center justify-center">
        {icon}
      </div>
      <div>
        <h4 className="text-gray-400 text-xs font-bold uppercase tracking-wider">{title}</h4>
        <div className="text-4xl font-serif mt-1">{value}</div>
        <p className="text-gray-500 text-xs mt-2">{label}</p>
      </div>
    </div>
  );
}

function ItemCard({ item }: { item: Item }) {
  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className="bg-white rounded-[32px] overflow-hidden shadow-sm group border border-gray-100"
    >
      <div className="aspect-[4/5] bg-gray-100 relative">
        {item.images?.[0] ? (
          <img src={item.images[0]} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <ShoppingBag size={48} />
          </div>
        )}
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          <div className="bg-white/90 backdrop-blur px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest self-start">
            {item.condition}
          </div>
          {item.distance !== undefined && (
            <div className="bg-[#5A5A40]/90 backdrop-blur px-3 py-1 rounded-full text-[10px] font-bold text-white uppercase tracking-widest self-start flex items-center gap-1">
              <Leaf size={10} /> {item.distance} km
            </div>
          )}
        </div>
      </div>
      <div className="p-6 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{item.category || 'Geral'}</span>
          <div className="flex items-center gap-1 text-[#5A5A40] text-sm">
            <Leaf size={12} fill="currentColor" />
            <span className="font-mono font-bold">{item.pointsValue}</span>
          </div>
        </div>
        <h5 className="text-xl font-serif">{item.title}</h5>
        <button className="w-full py-3 rounded-full border border-gray-200 text-sm font-medium hover:bg-[#1a1a1a] hover:text-white transition-all">
          Solicitar Troca
        </button>
      </div>
    </motion.div>
  );
}

function SuggestionChip({ text, onClick }: { text: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="bg-[#f5f5f0] hover:bg-[#ebebe5] px-4 py-2 rounded-full text-xs font-medium transition-colors"
    >
      {text}
    </button>
  );
}

function RewardCard({ title, provider, cost, image, description }: { title: string, provider: string, cost: number, image: string, description: string }) {
  return (
    <motion.div 
      whileHover={{ scale: 1.02 }}
      className="bg-white border border-gray-100 rounded-[32px] overflow-hidden shadow-sm flex flex-col"
    >
      <div className="h-40 overflow-hidden relative">
        <img src={image} alt={title} className="w-full h-full object-cover" />
        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-sm font-mono font-bold flex items-center gap-1 shadow-sm">
          <Leaf size={14} className="text-[#5A5A40]" fill="currentColor" /> {cost}
        </div>
      </div>
      <div className="p-6 space-y-2 flex-1 flex flex-col">
        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{provider}</span>
        <h4 className="text-xl font-serif">{title}</h4>
        <p className="text-sm text-gray-500 leading-relaxed flex-1">{description}</p>
        <button className="w-full mt-4 bg-[#f5f5f0] hover:bg-[#1a1a1a] hover:text-white py-3 rounded-full text-sm font-bold transition-all transition-colors">
          Resgatar
        </button>
      </div>
    </motion.div>
  );
}

function Badge({ icon, title, description, active }: { icon: React.ReactNode, title: string, description: string, active: boolean }) {
  return (
    <div className={cn(
      "flex items-center gap-4 p-4 rounded-2xl transition-all border",
      active ? "bg-[#f5f5f0] border-gray-100" : "bg-white border-dashed border-gray-200 opacity-40 grayscale"
    )}>
      <div className={cn(
        "w-12 h-12 rounded-xl flex items-center justify-center",
        active ? "bg-[#5A5A40] text-white" : "bg-gray-100 text-gray-400"
      )}>
        {icon}
      </div>
      <div>
        <h5 className="font-bold text-sm">{title}</h5>
        <p className="text-[10px] text-gray-500 uppercase font-medium">{description}</p>
      </div>
    </div>
  );
}
