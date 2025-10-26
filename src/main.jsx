import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

const API_URL = 'https://script.google.com/macros/s/AKfycbyYjxX97y2XaSNXzaloevChPqHaBwrZsrSOWNsJZLsn9-UEuTwvNDUFiOBG3gNjnQF7jA/exec';
//const API_URL = import.meta.env.VITE_API_URL;
const generateId = () => Math.random().toString(36).substring(2, 9);

const LOCATION_TABS = [
  { key: 'All', name: 'All Locations', color: 'gray' },
  { key: 'PantryIn', name: 'Inside Pantry', color: 'lime' },
  { key: 'PantryOut', name: 'Outside Pantry', color: 'lime' },
  { key: 'FreezerIn', name: 'Inside Freezer', color: 'sky' },
  { key: 'FreezerOut', name: 'Outside Freezer', color: 'sky' },
  { key: 'FridgeOut', name: 'Outside Fridge', color: 'amber' },
];

// API helpers
const apiList = async () => (await fetch(`${API_URL}?action=list`)).json();
const apiAdd = async (row) =>
  (await fetch(API_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'add',row})})).json();
const apiUpdateQuantity = async (id, delta) =>
  (await fetch(API_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'updateQuantity',id,delta})})).json();

const App = () => {
  const [inventory, setInventory] = useState([]);
  const [activeTab, setActiveTab] = useState(LOCATION_TABS[0].key);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchMinimized, setIsSearchMinimized] = useState(false);
  const [sortOrder, setSortOrder] = useState('A-Z');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const [newItem, setNewItem] = useState({
    name: '', location: LOCATION_TABS[1].key, quantity: 1, purchaseDate: ''
  });

  useEffect(() => {
    (async () => {
      try {
        const rows = await apiList();
        const normalized = rows.map(r => ({
          id: r.id, name: r.name, location: r.location,
          quantity: Number(r.quantity ?? 0), purchaseDate: r.purchaseDate || ''
        }));
        setInventory(normalized);
        localStorage.setItem('gabaInventory', JSON.stringify(normalized));
        setErr('');
      } catch {
        const stored = localStorage.getItem('gabaInventory');
        if (stored) setInventory(JSON.parse(stored));
        setErr('Online sync unavailable. Showing local data.');
      } finally { setLoading(false); }
    })();
  }, []);

  useEffect(() => { try { localStorage.setItem('gabaInventory', JSON.stringify(inventory)); } catch {} }, [inventory]);

  const handleUpdateQuantity = async (id, delta) => {
    setInventory(prev => prev.map(it => it.id === id ? {...it, quantity: Math.max(0, it.quantity + delta)} : it));
    try { await apiUpdateQuantity(id, delta); }
    catch { setErr('Could not update online. Changes kept locally.'); }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!newItem.name.trim() || newItem.quantity <= 0) return;
    const toAdd = {
      id: generateId(), name: newItem.name.trim(),
      location: newItem.location, purchasedate: newItem.purchaseDate || '',
      quantity: Number(newItem.quantity || 1),
    };
    setInventory(prev => [...prev, { id: toAdd.id, name: toAdd.name, location: toAdd.location, purchaseDate: toAdd.purchaseDate, quantity: toAdd.quantity }]);
    try { await apiAdd(toAdd); setErr(''); } catch { setErr('Could not save online. Item saved locally.'); }
    setIsModalOpen(false);
    setNewItem({ name:'', location: activeTab!=='All'?activeTab:LOCATION_TABS[1].key, quantity:1, purchaseDate:'' });
  };

  const locationMap = useMemo(()=>LOCATION_TABS.reduce((a,t)=>((a[t.key]=t.name),a),{}),[]);
  const filteredAndSortedInventory = useMemo(()=>{
    let f = activeTab==='All'?inventory:inventory.filter(i=>i.location===activeTab);
    if (searchTerm){const s=searchTerm.toLowerCase(); f=f.filter(i=>i.name.toLowerCase().includes(s)||(i.purchaseDate||'').includes(s));}
    return [...f].sort((a,b)=> sortOrder==='A-Z'? a.name.localeCompare(b.name): b.name.localeCompare(a.name));
  },[inventory,activeTab,searchTerm,sortOrder]);

  const LocationTabs = () => (
    <div className="flex overflow-x-auto p-2 bg-gray-800 shadow-lg text-sm sm:text-base">
      {LOCATION_TABS.map(tab=>(
        <button key={tab.key} onClick={()=>setActiveTab(tab.key)}
          className={`px-4 py-2 mx-1 rounded-full ${activeTab===tab.key?`bg-gradient-to-r from-${tab.color}-400 to-${tab.color}-600 text-gray-900 font-bold`:`bg-gray-700 text-gray-300 hover:bg-gray-600`}`}>
          {tab.name}
        </button>
      ))}
    </div>
  );

  const InventoryItem = ({ item }) => {
    const locationColor = LOCATION_TABS.find(t=>t.key===item.location)?.color || 'gray';
    return (
      <div className="flex items-center justify-between bg-gray-700 p-4 mb-3 rounded-xl shadow-md hover:bg-gray-600">
        <div className="flex flex-col flex-grow min-w-0 pr-4">
          <p className="text-lg font-semibold text-white truncate" title={item.name}>{item.name}</p>
          <div className="text-xs mt-1 space-x-2">
            <span className={`text-${locationColor}-300 font-medium`}>{locationMap[item.location]}</span>
            {item.purchaseDate && <span className="text-gray-400">Purchased: {item.purchaseDate}</span>}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button onClick={()=>handleUpdateQuantity(item.id,-1)} className="w-8 h-8 text-white bg-red-500 rounded-full hover:bg-red-600">-</button>
          <span className="text-xl font-extrabold text-lime-300 w-8 text-center">{item.quantity}</span>
          <button onClick={()=>handleUpdateQuantity(item.id,1)} className="w-8 h-8 text-white bg-green-500 rounded-full hover:bg-green-600">+</button>
        </div>
      </div>
    );
  };

  if (loading) return <div className="min-h-screen bg-gray-900 text-gray-300 flex items-center justify-center">Loading…</div>;

  return (
    <div className="min-h-screen bg-gray-900 font-inter flex flex-col">
      <header className="sticky top-0 z-40 bg-gray-900 p-4 shadow-xl">
        <h1 className="text-3xl font-extrabold text-white text-center">Gaba Inventory AI</h1>
        {!!err && <p className="text-center text-amber-300 text-sm mt-2">{err}</p>}
      </header>

      <div className="p-4 bg-gray-800">
        <input className="w-full p-2 rounded bg-gray-700 text-white" placeholder="Search name or 2024-06"
          value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} />
        <button className="mt-2 px-3 py-1 bg-gray-700 text-white rounded" onClick={()=>setSortOrder(sortOrder==='A-Z'?'Z-A':'A-Z')}>Sort: {sortOrder}</button>
      </div>

      <LocationTabs />

      <main className="flex-grow p-4 pt-6 pb-20 overflow-y-auto">
        {filteredAndSortedInventory.length ? (
          <div className="max-w-xl mx-auto">{filteredAndSortedInventory.map(i=><InventoryItem key={i.id} item={i} />)}</div>
        ) : (<div className="text-center p-8 text-gray-400">No Items Found</div>)}
      </main>

      {activeTab !== 'All' && (
        <div className="fixed bottom-4 right-4 z-50">
          <button onClick={()=>{setIsModalOpen(true); setNewItem(p=>({...p, location:activeTab}));}}
            className="w-16 h-16 rounded-full text-white bg-lime-500 hover:bg-lime-400">＋</button>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 p-6 rounded-2xl w-full max-w-md shadow-2xl">
            <h3 className="text-2xl font-bold text-lime-400 mb-4">Add New Inventory Item</h3>
            <form onSubmit={handleAddItem}>
              <label className="block text-gray-300 text-sm mb-1">Item Name</label>
              <input className="w-full p-3 rounded bg-gray-700 text-white mb-3" value={newItem.name}
                onChange={e=>setNewItem({...newItem, name:e.target.value})} required />

              <label className="block text-gray-300 text-sm mb-1">Location</label>
              <select className="w-full p-3 rounded bg-gray-700 text-white mb-3" value={newItem.location}
                onChange={e=>setNewItem({...newItem, location:e.target.value})} required>
                {LOCATION_TABS.filter(t=>t.key!=='All').map(t=><option key={t.key} value={t.key}>{t.name}</option>)}
              </select>

              <label className="block text-gray-300 text-sm mb-1">Quantity</label>
              <input type="number" min="1" className="w-full p-3 rounded bg-gray-700 text-white mb-3" value={newItem.quantity}
                onChange={e=>setNewItem({...newItem, quantity: parseInt(e.target.value)||1})} required />

              <label className="block text-gray-300 text-sm mb-1">Purchase Month/Year (optional)</label>
              <input className="w-full p-3 rounded bg-gray-700 text-white mb-6" placeholder="YYYY-MM"
                value={newItem.purchaseDate} onChange={e=>setNewItem({...newItem, purchaseDate:e.target.value})} />

              <div className="flex justify-end gap-3">
                <button type="button" onClick={()=>setIsModalOpen(false)} className="px-5 py-2 rounded bg-gray-600 text-white">Cancel</button>
                <button type="submit" className="px-5 py-2 rounded bg-lime-500 text-gray-900 font-bold">Add Item</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<React.StrictMode><App /></React.StrictMode>);
