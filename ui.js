/**
 * RoofScan AI - UI Presentation & Rendering Engine
 * Architecture: Clean DOM Builders & View Helpers (Separation of Concerns)
 */

(function (window) {
  'use strict';

  // Format numbers with commas
  function formatNumber(num) {
    if (num === null || num === undefined || isNaN(num)) return '0';
    return Number(num).toLocaleString('th-TH', { maximumFractionDigits: 1 });
  }

  // Format ISO date to readable Thai date
  function formatDate(isoStr) {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'short',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoStr;
    }
  }

  // Safe HTML Escape
  function escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  const RoofUI = {
    formatNumber,
    formatDate,
    escapeHTML,

    /**
     * Re-renders the main content area based on active tab
     */
    render(state) {
      const mainContainer = document.getElementById('main-content');
      if (!mainContainer) return;

      // Update Top Nav and Badges
      this.updateNavigation(state.activeTab);
      this.updateBadgeCount(state.records.length);
      this.updateHeaderApiStatus(Boolean(state.apiKey && state.apiKey.length > 5));

      // Render Tab Content
      switch (state.activeTab) {
        case 'scan':
          mainContainer.innerHTML = this.buildScanView(state);
          break;
        case 'records':
          mainContainer.innerHTML = this.buildRecordsView(state);
          break;
        case 'analytics':
          mainContainer.innerHTML = this.buildAnalyticsView(state);
          break;
        default:
          mainContainer.innerHTML = this.buildScanView(state);
      }
    },

    /**
     * Sync Bottom Navigation Tab Active state
     */
    updateNavigation(activeTab) {
      document.querySelectorAll('.bottom-nav .nav-item').forEach(btn => {
        if (btn.dataset.tab === activeTab) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
    },

    /**
     * Update Record Count Badge in Nav
     */
    updateBadgeCount(count) {
      const badge = document.getElementById('nav-records-count');
      if (badge) {
        badge.textContent = count > 99 ? '99+' : count;
        badge.style.display = count > 0 ? 'flex' : 'none';
      }
    },

    /**
     * Update Header API key status dot
     */
    updateHeaderApiStatus(hasKey) {
      const dot = document.getElementById('api-status-dot');
      if (dot) {
        if (hasKey) {
          dot.classList.add('active');
          dot.title = 'Gemini API Key พร้อมใช้งาน';
        } else {
          dot.classList.remove('active');
          dot.title = 'ยังไม่ได้ระบุ Gemini API Key';
        }
      }
    },

    /**
     * 1. SCAN TAB VIEW
     */
    buildScanView(state) {
      const hasImage = Boolean(state.previewImageBase64);
      const analysis = state.currentAnalysis;

      let imageSection = '';
      if (!hasImage) {
        imageSection = `
          <div class="card scan-choice-card">
            <div class="scan-choice-header">
              <div class="scan-choice-instruction">เลือกวิธีการนำเข้าภาพถ่ายหลังคา</div>
            </div>

            <div class="scan-choice-grid">
              <!-- ทางเลือกที่ 1: เลือกไฟล์ภาพจากเครื่อง / แกลเลอรี -->
              <div class="scan-choice-box" id="dropzone-satellite" role="button" tabindex="0">
                <input type="file" id="input-satellite-file" class="file-input-hidden" accept="image/*" capture="environment">
                <div class="choice-icon-circle upload-circle">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                  </svg>
                </div>
                <div class="choice-text-group">
                  <div class="choice-main-title">เลือกไฟล์ภาพถ่ายดาวเทียม</div>
                  <div class="choice-sub-title">เลือกภาพจากคลังรูปภาพ หรือไฟล์แคปหน้าจอในเครื่อง</div>
                </div>
                <div class="choice-badge">เลือกรูป</div>
              </div>

              <div class="scan-divider">
                <span>หรือ</span>
              </div>

              <!-- ทางเลือกที่ 2: เปิด Google Earth เพื่อไปหาพิกัดและแคปภาพ -->
              <a href="https://earth.google.com/web/" target="_blank" rel="noopener noreferrer" class="scan-choice-box earth-box">
                <div class="choice-icon-circle earth-circle">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="2" y1="12" x2="22" y2="12"></line>
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                  </svg>
                </div>
                <div class="choice-text-group">
                  <div class="choice-main-title">เข้าแอป Google Earth</div>
                  <div class="choice-sub-title">ค้นหาพิกัด ส่องหลังคา และแคปหน้าจอ</div>
                </div>
                <div class="choice-badge earth-badge">
                  <span>เปิดแอป</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                    <polyline points="15 3 21 3 21 9"></polyline>
                    <line x1="10" y1="14" x2="21" y2="3"></line>
                  </svg>
                </div>
              </a>
            </div>
          </div>
        `;
      } else {
        imageSection = `
          <div class="preview-container">
            <img src="${state.previewImageBase64}" alt="ภาพถ่ายดาวเทียมที่เลือก" class="preview-image" id="preview-img-element">
            <div class="preview-overlay-badge">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"></circle></svg>
              ภาพถ่ายดาวเทียม
            </div>
            <button id="btn-remove-preview" class="btn-remove-image" aria-label="ลบภาพ">✕</button>
          </div>

          <div class="card">
            <div class="form-group">
              <label for="input-location-title">ชื่อสถานที่ / เลขแปลงสำรวจ (Optional)</label>
              <input type="text" id="input-location-title" class="form-control" placeholder="เช่น อาคารพาณิชย์ พระราม 9 หรือ แปลง A-102" value="${escapeHTML(state.locationName || '')}">
            </div>

            ${!analysis ? `
              <button id="btn-run-analysis" class="btn btn-primary">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path>
                </svg>
                วิเคราะห์หลังคาด้วย Gemini Flash Lite 3.5
              </button>
            ` : ''}
          </div>
        `;
      }

      let resultSection = '';
      if (analysis) {
        const cat = window.RoofStore.ROOF_CATEGORIES.find(c => c.id === analysis.roofTypeId) || window.RoofStore.ROOF_CATEGORIES[0];
        resultSection = `
          <div class="card result-card" style="border-left-color: ${cat.color};">
            <div class="roof-badge" data-type="${cat.id}">
              <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background-color:${cat.color};"></span>
              ${escapeHTML(analysis.roofTypeName || cat.name)}
            </div>

            <div class="result-metrics-grid">
              <div class="metric-pill">
                <div class="metric-label">พื้นที่ประเมิน</div>
                <div class="metric-value">${formatNumber(analysis.estimatedAreaSqM)} <span class="metric-unit">ตร.ม.</span></div>
              </div>
              <div class="metric-pill">
                <div class="metric-label">ความมั่นใจ AI</div>
                <div class="metric-value">${escapeHTML(String(analysis.confidence))}<span class="metric-unit">%</span></div>
              </div>
              <div class="metric-pill">
                <div class="metric-label">รูปทรงหลังคา</div>
                <div class="metric-value" style="font-size:0.95rem;">${escapeHTML(analysis.slopeType || 'ทั่วไป')}</div>
              </div>
              <div class="metric-pill">
                <div class="metric-label">โทนสีที่ตรวจพบ</div>
                <div class="metric-value" style="font-size:0.95rem;">${escapeHTML(analysis.color || 'เอิร์ธโทน')}</div>
              </div>
            </div>

            <div class="result-notes-box">
              <strong>ลักษณะทางกายภาพ:</strong><br>
              ${escapeHTML(analysis.analysisNotes || 'ตรวจจับลักษณะพื้นผิวและรูปทรงเรียบร้อย')}
            </div>

            <button id="btn-save-record" class="btn btn-primary" style="margin-bottom: 8px;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                <polyline points="17 21 17 13 7 13 7 21"></polyline>
                <polyline points="7 3 7 8 15 8"></polyline>
              </svg>
              บันทึกข้อมูลเข้าสถิติ
            </button>
            <button id="btn-cancel-record" class="btn btn-secondary">
              ยกเลิกและสแกนใหม่
            </button>
          </div>
        `;
      }

      return `
        <div class="page-title-group">
          <h2 class="page-title">สำรวจหลังคาดาวเทียม</h2>
          <p class="page-subtitle">นำเข้าภาพ Google Earth หรือแผนที่เพื่อจำแนกประเภทและคำนวณพื้นที่</p>
        </div>
        ${imageSection}
        ${resultSection}
      `;
    },

    /**
     * 2. RECORDS TAB VIEW
     */
    buildRecordsView(state) {
      const categories = [{ id: 'all', name: 'ทั้งหมด' }, ...window.RoofStore.ROOF_CATEGORIES];
      const activeFilter = state.selectedFilter || 'all';
      const records = window.RoofStore.getFilteredRecords();

      const filterChips = categories.map(cat => `
        <button class="filter-chip ${cat.id === activeFilter ? 'active' : ''}" data-filter="${cat.id}">
          ${escapeHTML(cat.name)}
        </button>
      `).join('');

      let listHTML = '';
      if (records.length === 0) {
        listHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
            </div>
            <h3>ไม่มีรายการในหมวดหมู่นี้</h3>
            <p>เริ่มสแกนหลังคาจากแท็บ 'สแกนหลังคา' เพื่อสร้างฐานข้อมูล</p>
          </div>
        `;
      } else {
        listHTML = records.map(r => {
          const cat = window.RoofStore.ROOF_CATEGORIES.find(c => c.id === r.roofTypeId) || window.RoofStore.ROOF_CATEGORIES[0];
          return `
            <div class="record-item-card" data-record-id="${r.id}">
              ${r.image ? `<img src="${r.image}" class="record-thumb" alt="ภาพย่อ">` : `<div class="record-thumb" style="display:flex;align-items:center;justify-content:center;color:#64748b;font-size:10px;">ไม่มีภาพ</div>`}
              <div class="record-details">
                <div class="record-title">${escapeHTML(r.title)}</div>
                <div class="record-date">${formatDate(r.timestamp)}</div>
                <div class="record-tags">
                  <span class="record-tag-sm" style="background-color:${cat.bgColor}; color:${cat.color};">
                    ${escapeHTML(cat.shortName || cat.name)}
                  </span>
                  <span class="record-area">${formatNumber(r.estimatedAreaSqM)} ตร.ม.</span>
                </div>
              </div>
              <button class="btn-icon-del btn-delete-record" data-delete-id="${r.id}" title="ลบรายการ">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            </div>
          `;
        }).join('');
      }

      return `
        <div class="page-title-group">
          <h2 class="page-title">ประวัติการสำรวจ (${state.records.length})</h2>
          <p class="page-subtitle">รายการหลังคาทั้งหมดที่ตรวจสอบและบันทึกไว้ในอุปกรณ์</p>
        </div>

        <div class="records-filter-bar">
          ${filterChips}
        </div>

        <div class="records-list-container">
          ${listHTML}
        </div>
      `;
    },

    /**
     * 3. ANALYTICS TAB VIEW
     */
    buildAnalyticsView(state) {
      const summary = window.RoofStore.getAnalyticsSummary();

      if (summary.totalCount === 0) {
        return `
          <div class="page-title-group">
            <h2 class="page-title">สถิติและสัดส่วนพื้นที่</h2>
            <p class="page-subtitle">การวิเคราะห์มวลรวมของประเภทหลังคาและปริมาณการใช้งาน</p>
          </div>
          <div class="empty-state">
            <div class="empty-state-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <line x1="18" y1="20" x2="18" y2="10"></line>
                <line x1="12" y1="20" x2="12" y2="4"></line>
                <line x1="6" y1="20" x2="6" y2="14"></line>
              </svg>
            </div>
            <h3>ยังไม่มีข้อมูลเพียงพอสำหรับประมวลผล</h3>
            <p>กรุณาสแกนและบันทึกข้อมูลหลังคาอย่างน้อย 1 รายการเพื่อดูสถิติ</p>
          </div>
        `;
      }

      const progressBars = summary.breakdown.map(item => `
        <div class="category-progress-item">
          <div class="cat-header">
            <span class="cat-name">
              <span class="cat-indicator" style="background-color: ${item.color};"></span>
              ${escapeHTML(item.name)}
            </span>
            <span class="cat-stats">
              <strong>${item.areaPercentage}%</strong> (${formatNumber(item.totalArea)} ตร.ม. / ${item.count} หลัง)
            </span>
          </div>
          <div class="progress-track">
            <div class="progress-fill" style="width: ${item.areaPercentage}%; background-color: ${item.color};"></div>
          </div>
        </div>
      `).join('');

      return `
        <div class="page-title-group">
          <h2 class="page-title">สถิติและสัดส่วนพื้นที่</h2>
          <p class="page-subtitle">ประเมินสัดส่วนและปริมาณผู้ใช้หลังคาแต่ละประเภท</p>
        </div>

        <div class="stats-summary-grid">
          <div class="stat-box highlight">
            <div class="stat-label">พื้นที่หลังคารวมทั้งหมด</div>
            <div class="stat-value">${formatNumber(summary.totalArea)} <span style="font-size:1rem; font-weight:400;">ตร.ม.</span></div>
          </div>
          <div class="stat-box">
            <div class="stat-label">จำนวนหลังคาที่สำรวจ</div>
            <div class="stat-value">${summary.totalCount} <span style="font-size:0.85rem; font-weight:400; color:var(--text-secondary);">หลัง</span></div>
          </div>
          <div class="stat-box">
            <div class="stat-label">ขนาดเฉลี่ยต่อหลัง</div>
            <div class="stat-value">${formatNumber(summary.avgArea)} <span style="font-size:0.85rem; font-weight:400; color:var(--text-secondary);">ตร.ม.</span></div>
          </div>
        </div>

        <div class="card">
          <h3 style="font-size: 1rem; font-weight: 700; margin-bottom: 14px;">สัดส่วนพื้นที่ตามประเภทหลังคา (Market Share)</h3>
          ${progressBars}
        </div>

        <div class="card">
          <h3 style="font-size: 1rem; font-weight: 700; margin-bottom: 12px;">การจัดการและส่งออกข้อมูล</h3>
          <div style="display: flex; gap: 10px;">
            <button id="btn-export-csv" class="btn btn-secondary">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              ส่งออก CSV
            </button>
            <button id="btn-clear-all" class="btn btn-danger-outline">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              ล้างข้อมูลทั้งหมด
            </button>
          </div>
        </div>
      `;
    },

    /**
     * Display a floating mobile toast notification
     */
    showToast(message, type = 'info') {
      const container = document.getElementById('toast-container');
      if (!container) return;

      const toast = document.createElement('div');
      toast.className = `toast ${type}`;
      toast.textContent = message;

      container.appendChild(toast);

      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s ease';
        setTimeout(() => toast.remove(), 300);
      }, 2600);
    },

    /**
     * Show / Hide full screen loading spinner
     */
    setLoading(isLoading, message = 'กำลังวิเคราะห์ภาพถ่ายดาวเทียมด้วย Gemini Flash Lite 3.5...') {
      const overlay = document.getElementById('loading-overlay');
      const text = document.getElementById('loading-text');
      if (overlay) {
        if (isLoading) {
          if (text) text.textContent = message;
          overlay.classList.remove('hidden');
        } else {
          overlay.classList.add('hidden');
        }
      }
    }
  };

  window.RoofUI = RoofUI;
})(window);
