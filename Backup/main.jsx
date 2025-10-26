import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom/client';

// Helper function to generate unique IDs
const generateId = () => Math.random().toString(36).substring(2, 9);

// Configuration for all inventory locations
const LOCATION_TABS = [
  { key: 'All', name: 'All Locations', color: 'gray' },
  { key: 'PantryIn', name: 'Inside Pantry', color: 'lime' },
  { key: 'PantryOut', name: 'Outside Pantry', color: 'lime' },
  { key: 'FreezerIn', name: 'Inside Freezer', color: 'sky' },
  { key: 'FreezerOut', name: 'Outside Freezer', color: 'sky' },
  { key: 'FridgeOut', name: 'Outside Fridge', color: 'amber' },
];

/**
 * Manages the state and logic for the Gaba Inventory AI application.
 * Uses localStorage for client-side persistence (to be replaced with Google Sheets API calls).
 */
const App = () => {
  const [inventory, setInventory] = useState([]);
  const [activeTab, setActiveTab] = useState(LOCATION_TABS[0].key);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchMinimized, setIsSearchMinimized] = useState(false);
  const [sortOrder, setSortOrder] = useState('A-Z'); // 'A-Z' or 'Z-A'
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newItem, setNewItem] = useState({
    name: '',
    location: LOCATION_TABS[1].key, // Default to Inside Pantry
    quantity: 1,
    purchaseDate: '', // Format YYYY-MM
  });

  // --- LOCAL STORAGE EFFECTS ---

  // Load inventory from localStorage on initial render
  useEffect(() => {
    try {
      const storedInventory = localStorage.getItem('gabaInventory');
      if (storedInventory) {
        setInventory(JSON.parse(storedInventory));
      }
    } catch (error) {
      console.error("Error loading inventory from localStorage:", error);
    }
  }, []);

  // Save inventory to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('gabaInventory', JSON.stringify(inventory));
    } catch (error) {
      console.error("Error saving inventory to localStorage:", error);
    }
  }, [inventory]);

  // --- CRUD OPERATIONS (Replace these with Google Sheets API calls) ---

  const handleUpdateQuantity = (id, delta) => {
    setInventory(prev => prev.map(item =>
      item.id === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item
    ));
    // NOTE: In the final Google Sheets implementation, you would add an API call here.
  };

  const handleAddItem = (e) => {
    e.preventDefault();
    if (newItem.name.trim() && newItem.quantity > 0) {
      const itemToAdd = {
        ...newItem,
        id: generateId(),
        name: newItem.name.trim(),
      };

      setInventory(prev => [...prev, itemToAdd]);
      setIsModalOpen(false);
      setNewItem({
        name: '',
        location: activeTab !== 'All' ? activeTab : LOCATION_TABS[1].key,
        quantity: 1,
        purchaseDate: '',
      });
      // NOTE: In the final Google Sheets implementation, you would add an API call here.
    }
  };

  // --- FILTERS AND SORTS ---

  const locationMap = LOCATION_TABS.reduce((acc, tab) => {
    acc[tab.key] = tab.name;
    return acc;
  }, {});

  const filteredAndSortedInventory = useMemo(() => {
    let filtered = inventory;

    // 1. Filter by Location
    if (activeTab !== 'All') {
      filtered = filtered.filter(item => item.location === activeTab);
    }

    // 2. Filter by Search Term
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(lowerSearch) ||
        (item.purchaseDate && item.purchaseDate.includes(lowerSearch))
      );
    }

    // 3. Sort
    filtered.sort((a, b) => {
      const nameA = a.name.toLowerCase();
      const nameB = b.name.toLowerCase();

      if (sortOrder === 'A-Z') {
        return nameA.localeCompare(nameB);
      } else {
        return nameB.localeCompare(nameA);
      }
    });

    return filtered;
  }, [inventory, activeTab, searchTerm, sortOrder]);

  // --- COMPONENTS ---

  const LocationTabs = () => (
    <div className="flex overflow-x-auto p-2 bg-gray-800 shadow-lg text-sm sm:text-base">
      {LOCATION_TABS.map((tab) => (
        <button
          key={tab.key}
          onClick={() => setActiveTab(tab.key)}
          className={`px-4 py-2 mx-1 rounded-full whitespace-nowrap transition-all duration-200
            ${activeTab === tab.key
              ? `bg-gradient-to-r from-${tab.color}-400 to-${tab.color}-600 text-gray-900 font-bold shadow-md`
              : `bg-gray-700 text-gray-300 hover:bg-gray-600`
            }`}
        >
          {tab.name}
        </button>
      ))}
    </div>
  );

  const InventoryItem = ({ item }) => {
    const locationInfo = locationMap[item.location];
    const locationColor = LOCATION_TABS.find(t => t.key === item.location)?.color || 'gray';

    return (
      <div className="flex items-center justify-between bg-gray-700 p-4 mb-3 rounded-xl shadow-md transition-all duration-300 hover:bg-gray-600">
        <div className="flex flex-col flex-grow min-w-0 pr-4">
          <p className="text-lg font-semibold text-white truncate" title={item.name}>
            {item.name}
          </p>
          <div className="text-xs mt-1 space-x-2">
            <span className={`text-${locationColor}-300 font-medium`}>
              {locationInfo}
            </span>
            {item.purchaseDate && (
              <span className="text-gray-400">
                Purchased: {item.purchaseDate}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleUpdateQuantity(item.id, -1)}
            className="w-8 h-8 flex items-center justify-center text-white bg-red-500 rounded-full hover:bg-red-600 transition-colors active:scale-95 shadow-lg"
            aria-label={`Decrease quantity of ${item.name}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M20 12H4" /></svg>
          </button>

          <span className="text-xl font-extrabold text-lime-300 w-8 text-center">
            {item.quantity}
          </span>

          <button
            onClick={() => handleUpdateQuantity(item.id, 1)}
            className="w-8 h-8 flex items-center justify-center text-white bg-green-500 rounded-full hover:bg-green-600 transition-colors active:scale-95 shadow-lg"
            aria-label={`Increase quantity of ${item.name}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
          </button>
        </div>
      </div>
    );
  };

  const SearchAndSortBar = () => (
    <div className={`p-4 bg-gray-800 shadow-xl transition-all duration-300 overflow-hidden ${isSearchMinimized ? 'h-14' : 'h-32 sm:h-28'}`}>
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-xl font-bold text-white">Search & Filter</h2>
        <button
          onClick={() => setIsSearchMinimized(!isSearchMinimized)}
          className="text-gray-400 hover:text-white transition-colors p-1 rounded-full bg-gray-700"
          aria-label={isSearchMinimized ? 'Expand search bar' : 'Minimize search bar'}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transform transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ transform: isSearchMinimized ? 'rotate(0deg)' : 'rotate(180deg)' }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
          </svg>
        </button>
      </div>

      <div className={`space-y-3 transition-opacity duration-300 ${isSearchMinimized ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <input
          type="text"
          placeholder="Search items or purchase date (e.g., 2024-06)"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-2 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:ring-2 focus:ring-lime-500 focus:border-transparent border-none"
        />

        <div className="flex space-x-3">
          <button
            onClick={() => setSortOrder(sortOrder === 'A-Z' ? 'Z-A' : 'A-Z')}
            className="flex-1 p-2 rounded-lg text-white bg-gray-700 hover:bg-gray-600 transition-colors flex items-center justify-center text-sm font-medium"
            aria-label={`Current sort order is ${sortOrder}. Click to change.`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4h18M3 8h12M3 12h18M3 16h12M3 20h18" /></svg>
            Sort: {sortOrder}
          </button>
        </div>
      </div>
    </div>
  );

  const AddItemModal = () => {
    if (!isModalOpen) return null;

    const locationOptions = LOCATION_TABS.filter(t => t.key !== 'All');

    return (
      <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4">
        <div className="bg-gray-800 p-6 rounded-2xl w-full max-w-md shadow-2xl">
          <h3 className="text-2xl font-bold text-lime-400 mb-4">Add New Inventory Item</h3>
          <form onSubmit={handleAddItem}>
            <div className="mb-4">
              <label htmlFor="itemName" className="block text-gray-300 text-sm font-medium mb-1">Item Name</label>
              <input
                id="itemName"
                type="text"
                value={newItem.name}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                required
                className="w-full p-3 rounded-lg bg-gray-700 text-white focus:ring-2 focus:ring-lime-500 border-none"
                placeholder="e.g., Canned Black Beans"
              />
            </div>

            <div className="mb-4">
              <label htmlFor="itemLocation" className="block text-gray-300 text-sm font-medium mb-1">Location</label>
              <select
                id="itemLocation"
                value={newItem.location}
                onChange={(e) => setNewItem({ ...newItem, location: e.target.value })}
                required
                className="w-full p-3 rounded-lg bg-gray-700 text-white focus:ring-2 focus:ring-lime-500 border-none"
              >
                {locationOptions.map(tab => (
                  <option key={tab.key} value={tab.key}>{tab.name}</option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label htmlFor="itemQuantity" className="block text-gray-300 text-sm font-medium mb-1">Quantity</label>
              <input
                id="itemQuantity"
                type="number"
                min="1"
                value={newItem.quantity}
                onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 1 })}
                required
                className="w-full p-3 rounded-lg bg-gray-700 text-white focus:ring-2 focus:ring-lime-500 border-none"
              />
            </div>

            <div className="mb-6">
              <label htmlFor="itemDate" className="block text-gray-300 text-sm font-medium mb-1">Purchase Month/Year (Optional)</label>
              <input
                id="itemDate"
                type="text"
                value={newItem.purchaseDate}
                onChange={(e) => setNewItem({ ...newItem, purchaseDate: e.target.value })}
                className="w-full p-3 rounded-lg bg-gray-700 text-white focus:ring-2 focus:ring-lime-500 border-none"
                placeholder="YYYY-MM (e.g., 2024-06)"
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2 rounded-full text-gray-300 bg-gray-600 hover:bg-gray-500 transition-colors font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-full text-gray-900 bg-lime-500 hover:bg-lime-400 transition-colors font-bold shadow-lime-500/50 shadow-lg"
              >
                Add Item
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 font-inter flex flex-col">
      <style>{`
        /* Custom scrollbar for webkit browsers */
        .overflow-x-auto::-webkit-scrollbar {
          height: 4px;
        }
        .overflow-x-auto::-webkit-scrollbar-thumb {
          background-color: #a7a7a7;
          border-radius: 4px;
        }
        .overflow-x-auto::-webkit-scrollbar-track {
          background-color: #4a4a4a;
        }
      `}</style>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-gray-900 p-4 shadow-xl">
        <h1 className="text-3xl font-extrabold text-white text-center">Gaba Inventory AI</h1>
      </header>

      {/* Search and Sort */}
      <SearchAndSortBar />

      {/* Tabs */}
      <LocationTabs />

      {/* Main Content Area */}
      <main className="flex-grow p-4 pt-6 pb-20 overflow-y-auto">
        {filteredAndSortedInventory.length > 0 ? (
          <div className="max-w-xl mx-auto">
            {filteredAndSortedInventory.map(item => (
              <InventoryItem key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className="text-center p-8 text-gray-400">
            <p className="text-xl font-semibold mb-2">No Items Found</p>
            <p>
              {activeTab === 'All'
                ? 'Your inventory is currently empty.'
                : `No items found in the ${locationMap[activeTab]}.`
              }
            </p>
          </div>
        )}
      </main>

      {/* Add Item Button (Fixed at bottom) */}
      {activeTab !== 'All' && (
        <div className="fixed bottom-4 right-4 z-50">
          <button
            onClick={() => {
              setIsModalOpen(true);
              setNewItem(prev => ({ ...prev, location: activeTab }));
            }}
            className="w-16 h-16 rounded-full text-white bg-lime-500 hover:bg-lime-400 transition-all duration-300 shadow-xl flex items-center justify-center active:scale-90"
            aria-label="Add new item to inventory"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
          </button>
        </div>
      )}

      {/* Modal for Adding Item */}
      <AddItemModal />
    </div>
  );
};

export default App;

// Standard React App setup (for a complete, runnable file)
const container = document.getElementById('root');
if (container) {
  const root = ReactDOM.createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
