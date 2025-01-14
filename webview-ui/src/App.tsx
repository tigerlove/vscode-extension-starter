import { useEffect, useState } from 'react';
import { vscode } from './utilities/vscode';
import RuleCard from './components/RuleCard';
import './App.css';
import rulesData from '../public/rules.json';

interface RuleAuthor {
  name: string;
  url: string | null;
  avatar: string | null;
}

interface Rule {
  title: string;
  tags: string[];
  slug: string;
  libs: string[];
  content: string;
  author: RuleAuthor;
}

function App() {
  console.log('App component rendering');
  const [rules, setRules] = useState<Rule[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  console.log('Current selectedCategory:', selectedCategory);
  const [categories, setCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [needsSync, setNeedsSync] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    console.log('App useEffect triggered - initial setup');
    // Set initial rules from local file
    setRules(rulesData as Rule[]);
    // Extract categories from local rules
    const cats = Array.from(new Set((rulesData as Rule[]).flatMap(r => r.tags))) as string[];
    setCategories(['all', ...cats.sort((a, b) => {
      const countA = (rulesData as Rule[]).filter(r => r.tags.includes(a)).length;
      const countB = (rulesData as Rule[]).filter(r => r.tags.includes(b)).length;
      return countB - countA;
    })]);
    
    // Request rules from extension for potential updates
    console.log('Sending getRules message to extension');
    vscode.postMessage({ type: 'getRules' });

    // Handle messages from extension
    const messageHandler = (event: MessageEvent) => {
      console.log('Message received in event handler:', event.data);
      handleMessage(event);
    };

    window.addEventListener('message', messageHandler);
    console.log('Message event listener added');

    return () => {
      console.log('Cleaning up message event listener');
      window.removeEventListener('message', messageHandler);
    };
  }, []);

  const handleMessage = (event: MessageEvent) => {
    console.log('handleMessage called with data:', event.data);
    const message = event.data;
    switch (message.type) {
      case 'setRules':
        console.log('Processing setRules message');
        console.log('Rules array length:', message.rules?.length ?? 'undefined');
        console.log('Last sync:', message.lastSync);
        console.log('Needs sync:', message.needsSync);
        console.log('Is offline:', message.isOffline);
        
        if (!Array.isArray(message.rules)) {
          console.error('Received rules is not an array:', message.rules);
          return;
        }

        setRules(message.rules);
        setLastSync(message.lastSync);
        setNeedsSync(message.needsSync);
        setIsOffline(message.isOffline);

        // Extract unique categories and sort by rule count
        const cats = Array.from(new Set(message.rules.flatMap((r: Rule) => r.tags))) as string[];
        console.log('Extracted categories:', cats);
        
        const sortedCats = cats.sort((a, b) => {
          const countA = message.rules.filter((r: Rule) => r.tags.includes(a)).length;
          const countB = message.rules.filter((r: Rule) => r.tags.includes(b)).length;
          return countB - countA;
        });
        console.log('Sorted categories:', ['all', ...sortedCats]);
        setCategories(['all', ...sortedCats]);
        break;
      case 'syncComplete':
        console.log('Processing syncComplete message');
        setIsSyncing(false);
        setLastSync(message.lastSync);
        setNeedsSync(false);
        setIsOffline(false);
        break;
      default:
        console.log('Unhandled message type:', message.type);
    }
  };

  const handleRuleSelect = (rule: Rule) => {
    console.log('Rule selected:', rule);
    vscode.postMessage({ type: 'setRule', rule });
  };

  const handleSync = () => {
    setIsSyncing(true);
    vscode.postMessage({ type: 'syncRules' });
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value.toLowerCase());
  };

  // Filter categories based on search query
  const filteredCategories = categories.filter(category => 
    category === 'all' || category.toLowerCase().includes(searchQuery)
  );

  // Filter rules by selected category
  const filteredRules = rules.filter(rule => {
    const shouldInclude = selectedCategory === 'all' || rule.tags.includes(selectedCategory);
    console.log(`Rule ${rule.title}: tags=${JSON.stringify(rule.tags)}, selectedCategory=${selectedCategory}, included=${shouldInclude}`);
    return shouldInclude;
  });

  // Check for duplicate slugs
  const slugCounts = filteredRules.reduce((acc, rule) => {
    acc[rule.slug] = (acc[rule.slug] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const duplicateSlugs = Object.entries(slugCounts)
    .filter(([_, count]) => count > 1)
    .map(([slug]) => slug);

  if (duplicateSlugs.length > 0) {
    console.warn('Found duplicate slugs:', duplicateSlugs);
    console.warn('Rules with duplicate slugs:', filteredRules.filter(r => duplicateSlugs.includes(r.slug)));
  }

  console.log('selectedCategory:', selectedCategory);
  console.log('Total rules before filtering:', rules.length);
  console.log('Filtered rules count:', filteredRules.length);
  console.log('Filtered rules:', filteredRules.map(r => r.title));

  // Calculate category counts
  const categoryRuleCounts = rules.reduce((acc, rule) => {
    rule.tags.forEach(tag => {
      acc[tag] = (acc[tag] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);

  const formatLastSync = (timestamp: number | null) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  console.log('Rendering with:', {
    rulesCount: rules.length,
    filteredCategoriesCount: filteredCategories.length,
    finalFilteredCount: filteredRules.length,
    selectedCategory,
    searchQuery,
    needsSync,
    isOffline
  });

  return (
    <div className="app-container">
      <div className="sidebar">
        <div className="search-container">
          <input
            type="text"
            placeholder="Search categories..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="search-input"
          />
          <div className="sync-container">
            {(needsSync && !isOffline) && (
              <button 
                className={`sync-button ${isOffline ? 'offline' : ''}`}
                onClick={handleSync}
                disabled={isSyncing}
              >
                {isSyncing ? 'Syncing...' : isOffline ? 'Sync Rules (Offline)' : 'Sync Rules'}
              </button>
            )}
            <div className="last-sync">
              Last sync: {formatLastSync(lastSync)}
              {isOffline && <span className="offline-indicator"> (Using local rules)</span>}
            </div>
          </div>
        </div>
        <nav>
          {filteredCategories.map(category => (
            <button
              key={category}
              className={`category-button ${selectedCategory === category ? 'active' : ''}`}
              onClick={() => {
                console.log('Category clicked:', category);
                setSelectedCategory(category);
                console.log('Setting category to:', category);
              }}
            >
              {category}
              <span className="category-count">
                {category === 'all' 
                  ? rules.length
                  : categoryRuleCounts[category] || 0}
              </span>
            </button>
          ))}
        </nav>
      </div>
      <div className="content">
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: '16px',
          padding: '16px',
          height: '100vh',
          overflow: 'auto',
          maxWidth: '100%'
        }}>
          {filteredRules.map((rule, index) => {
            console.log(`Rendering rule ${index}:`, { slug: rule.slug, title: rule.title });
            return (
              <RuleCard 
                key={`${rule.slug}-${index}`}
                rule={rule} 
                onSelect={handleRuleSelect} 
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default App;
