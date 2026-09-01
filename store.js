/**
 * RoofScan AI - State Management & Data Store Layer
 * Architecture: Reactive Single Source of Truth with LocalStorage Persistence
 */

(function (window) {
  'use strict';

  // Master Categories of Roofs
  const ROOF_CATEGORIES = [
    {
      id: 'metal_sheet',
      name: 'หลังคาเมทัลชีท',
      shortName: 'เมทัลชีท',
      color: '#0284c7',
      bgColor: '#e0f2fe'
    },
    {
      id: 'concrete_tile',
      name: 'หลังคากระเบื้องคอนกรีต/ซีแพค',
      shortName: 'ซีแพค/คอนกรีต',
      color: '#ea580c',
      bgColor: '#ffedd5'
    },
    {
      id: 'corrugated_tile',
      name: 'หลังคากระเบื้องลอนคู่/ไฟเบอร์ซีเมนต์',
      shortName: 'ลอนคู่',
      color: '#64748b',
      bgColor: '#f1f5f9'
    },
    {
      id: 'flat_slab',
      name: 'คอนกรีตดาดฟ้า / Flat Slab',
      shortName: 'ดาดฟ้าคอนกรีต',
      color: '#7c3aed',
      bgColor: '#ede9fe'
    },
    {
      id: 'solar_rooftop',
      name: 'หลังคาติดตั้งโซลาร์เซลล์',
      shortName: 'โซลาร์เซลล์',
      color: '#059669',
      bgColor: '#d1fae5'
    }
  ];

  const STORAGE_KEYS = {
    RECORDS: 'roofscan_records_v1',
    API_KEY: 'roofscan_gemini_api_key_v1'
  };

  // Internal reactive state
  const state = {
    activeTab: 'scan',             // 'scan' | 'records' | 'analytics'
    apiKey: '',
    records: [],
    currentAnalysis: null,         // Pending analysis result before save
    selectedFilter: 'all',         // For records tab filtering
    previewImageBase64: null,      // Image selected for scanning
    locationName: ''
  };

  const listeners = new Set();

  function notify() {
    listeners.forEach(fn => {
      try {
        fn(state);
      } catch (err) {
        console.error('[RoofStore] Listener Error:', err);
      }
    });
  }

  const RoofStore = {
    ROOF_CATEGORIES,

    /**
     * Initializer: Reads local storage and boots default state
     */
    init() {
      try {
        const storedKey = localStorage.getItem(STORAGE_KEYS.API_KEY);
        if (storedKey) {
          state.apiKey = storedKey;
        }

        const storedRecords = localStorage.getItem(STORAGE_KEYS.RECORDS);
        if (storedRecords) {
          state.records = JSON.parse(storedRecords);
        } else {
          state.records = [];
        }
      } catch (err) {
        console.warn('[RoofStore] Failed to parse localStorage records:', err);
        state.records = [];
      }
      notify();
    },

    /**
     * Subscribe to state modifications
     * @param {Function} listener 
     * @returns {Function} unsubscribe
     */
    subscribe(listener) {
      listeners.add(listener);
      listener(state); // Immediate trigger
      return () => listeners.delete(listener);
    },

    /**
     * Get a snapshot of current state
     */
    getState() {
      return { ...state };
    },

    /**
     * Set active navigation tab
     * @param {'scan'|'records'|'analytics'} tab 
     */
    setActiveTab(tab) {
      if (['scan', 'records', 'analytics'].includes(tab)) {
        state.activeTab = tab;
        notify();
      }
    },

    /**
     * Set filter for Records view
     * @param {string} filter 'all' or category ID
     */
    setSelectedFilter(filter) {
      state.selectedFilter = filter;
      notify();
    },

    /**
     * Set the selected image base64
     */
    setPreviewImage(base64) {
      state.previewImageBase64 = base64;
      state.currentAnalysis = null; // Reset previous scan result if new image chosen
      notify();
    },

    /**
     * Set location/name note for current scan
     */
    setLocationName(name) {
      state.locationName = name;
    },

    /**
     * Save API Key
     * @param {string} key 
     */
    setApiKey(key) {
      state.apiKey = (key || '').trim();
      try {
        localStorage.setItem(STORAGE_KEYS.API_KEY, state.apiKey);
      } catch (err) {
        console.error('[RoofStore] Could not persist API key:', err);
      }
      notify();
    },

    getApiKey() {
      return state.apiKey;
    },

    hasApiKey() {
      return Boolean(state.apiKey && state.apiKey.length > 5);
    },

    /**
     * Store temporary analysis result from Gemini
     */
    setCurrentAnalysis(data) {
      state.currentAnalysis = data;
      notify();
    },

    clearCurrentAnalysis() {
      state.currentAnalysis = null;
      state.previewImageBase64 = null;
      state.locationName = '';
      notify();
    },

    /**
     * Commit current analysis to persistent records
     */
    saveCurrentRecord() {
      if (!state.currentAnalysis) return null;

      const category = ROOF_CATEGORIES.find(c => c.id === state.currentAnalysis.roofTypeId) || ROOF_CATEGORIES[0];

      const newRecord = {
        id: 'roof_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        timestamp: new Date().toISOString(),
        title: (state.locationName || '').trim() || `แปลงสำรวจ #${state.records.length + 1}`,
        image: state.previewImageBase64 || '',
        roofTypeId: category.id,
        roofTypeName: state.currentAnalysis.roofTypeName || category.name,
        confidence: Number(state.currentAnalysis.confidence) || 85,
        estimatedAreaSqM: Number(state.currentAnalysis.estimatedAreaSqM) || 120,
        slopeType: state.currentAnalysis.slopeType || 'Gable',
        color: state.currentAnalysis.color || 'เทา/น้ำเงิน',
        condition: state.currentAnalysis.condition || 'สมบูรณ์',
        analysisNotes: state.currentAnalysis.analysisNotes || 'ตรวจจับโครงสร้างหลังคาด้วยภาพถ่ายดาวเทียม'
      };

      state.records.unshift(newRecord);
      this._persistRecords();

      // Reset temporary scanner state
      state.currentAnalysis = null;
      state.previewImageBase64 = null;
      state.locationName = '';

      notify();
      return newRecord;
    },

    /**
     * Delete record by ID
     */
    deleteRecord(id) {
      const idx = state.records.findIndex(r => r.id === id);
      if (idx !== -1) {
        state.records.splice(idx, 1);
        this._persistRecords();
        notify();
        return true;
      }
      return false;
    },

    /**
     * Clear all records
     */
    clearAllRecords() {
      state.records = [];
      this._persistRecords();
      notify();
    },

    /**
     * Get filtered records according to selected category
     */
    getFilteredRecords() {
      if (state.selectedFilter === 'all') {
        return state.records;
      }
      return state.records.filter(r => r.roofTypeId === state.selectedFilter);
    },

    /**
     * Statistical aggregation for Analytics Tab
     */
    getAnalyticsSummary() {
      const totalCount = state.records.length;
      const totalArea = state.records.reduce((sum, r) => sum + (Number(r.estimatedAreaSqM) || 0), 0);
      const avgArea = totalCount > 0 ? Math.round(totalArea / totalCount) : 0;

      // Group by Category
      const categoryMap = {};
      ROOF_CATEGORIES.forEach(cat => {
        categoryMap[cat.id] = {
          ...cat,
          count: 0,
          totalArea: 0,
          countPercentage: 0,
          areaPercentage: 0
        };
      });

      state.records.forEach(record => {
        const catId = record.roofTypeId;
        if (categoryMap[catId]) {
          categoryMap[catId].count += 1;
          categoryMap[catId].totalArea += (Number(record.estimatedAreaSqM) || 0);
        }
      });

      const breakdown = Object.values(categoryMap).map(cat => {
        const countPercentage = totalCount > 0 ? ((cat.count / totalCount) * 100).toFixed(1) : '0.0';
        const areaPercentage = totalArea > 0 ? ((cat.totalArea / totalArea) * 100).toFixed(1) : '0.0';
        return {
          ...cat,
          countPercentage: parseFloat(countPercentage),
          areaPercentage: parseFloat(areaPercentage)
        };
      });

      // Sort by area descending
      breakdown.sort((a, b) => b.totalArea - a.totalArea);

      // Dominant category
      const dominant = breakdown.length > 0 && totalCount > 0 ? breakdown[0] : null;

      return {
        totalCount,
        totalArea,
        avgArea,
        breakdown,
        dominant
      };
    },

    _persistRecords() {
      try {
        localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(state.records));
      } catch (err) {
        console.error('[RoofStore] LocalStorage write quota exceeded:', err);
      }
    }
  };

  window.RoofStore = RoofStore;
})(window);
