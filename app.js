/**
 * RoofScan AI - Main Controller & Application Orchestrator
 * Architecture: Event-driven Controller coordinating Store, UI, and AI Gateway
 */

(function () {
  'use strict';

  // [MANDATORY REQUIREMENT]: Model MUST be specified as 'Gemini Flash Lite 3.5'
  const GEMINI_MODEL = "Gemini Flash Lite 3.5";

  /**
   * Helper: Compress image via canvas before sending to API (Mobile optimization)
   */
  function compressImage(file, maxDimension = 1200, quality = 0.82) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedBase64);
        };
        img.onerror = reject;
        img.src = event.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Call Gemini Flash Lite 3.5 API with satellite image
   */
  async function analyzeRoofWithGemini(base64Image, apiKey) {
    // Exact model specification as required
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${apiKey}`;

    // Extract raw base64 and mime type
    const matches = base64Image.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
    const mimeType = matches ? matches[1] : 'image/jpeg';
    const rawData = matches ? matches[2] : base64Image;

    const systemPrompt = `
คุณคือผู้เชี่ยวชาญด้านการสำรวจและจำแนกประเภทหลังคาจากภาพถ่ายดาวเทียม (Satellite & Aerial Roof Inspection Specialist).
หน้าที่ของคุณคือวิเคราะห์ภาพถ่ายดาวเทียม/แผนที่ทางอากาศที่ผู้ใช้ส่งมา เพื่อประเมิน:
1. ประเภทหลังคา โดยต้องเลือก roofTypeId ให้ตรงกับ 1 ใน 5 ประเภทนี้เท่านั้น:
   - "metal_sheet" (หลังคาเมทัลชีท: ผิวลอนยาว สม่ำเสมอ มักเป็นสีน้ำเงิน เทา หรือเมทัลลิก)
   - "concrete_tile" (หลังคากระเบื้องคอนกรีต/ซีแพค: ลอนหนา สีโทนเอิร์ธ แดง ส้ม น้ำตาล เทา มีมิติชัดเจน)
   - "corrugated_tile" (หลังคากระเบื้องลอนคู่/ไฟเบอร์ซีเมนต์: ลอนคลื่นสีเทาด้านหรือสีคลาสสิก มักพบในบ้านเดี่ยวหรือชุมชน)
   - "flat_slab" (คอนกรีตดาดฟ้า / Flat Slab: พื้นผิวระนาบเรียบ ปราศจากลอน มักพบในตึกแถวหรืออาคารพาณิชย์)
   - "solar_rooftop" (หลังคาติดตั้งโซลาร์เซลล์: มีแผงสี่เหลี่ยมผืนผ้าสีน้ำเงินเข้ม/ดำเรียงเป็นแถว Grid บนหลังคา)
2. ประเมินพื้นที่หลังคา (estimatedAreaSqM) เป็นตัวเลขจำนวนเต็ม ตร.ม. โดยประมาณจากขนาดสัดส่วนอาคารในภาพดาวเทียมทั่วไป (เช่น 60-400 ตร.ม.)
3. ความมั่นใจ (confidence) เป็นตัวเลข 0-100
4. รูปทรงหลังคา (slopeType) เช่น หลังคาจั่ว (Gable), หลังคาปั้นหยา (Hip), เพิงหมาแหงน (Shed), หรือ ดาดฟ้าเรียบ (Flat)
5. โทนสีเด่น (color)
6. สภาพผิวหลังคา (condition) เช่น สภาพดี, ปานกลาง, เก่ามีคราบ
7. คำอธิบายวิเคราะห์สั้นๆ (analysisNotes) ภาษาไทย 1-2 ประโยค ชี้จุดสังเกตที่ทำให้ระบุประเภทนี้ได้

ส่งผลลัพธ์กลับมาเป็นโครงสร้าง JSON ดังนี้เท่านั้น:
{
  "roofTypeId": "metal_sheet",
  "roofTypeName": "หลังคาเมทัลชีท",
  "confidence": 92,
  "estimatedAreaSqM": 150,
  "slopeType": "หลังคาจั่ว (Gable)",
  "color": "สีน้ำเงินเข้ม",
  "condition": "สภาพดี",
  "analysisNotes": "พบลักษณะสันลอนยาวขนานกันอย่างต่อเนื่อง มีการสะท้อนแสงสม่ำเสมอ บ่งชี้ว่าเป็นแผ่นเมทัลชีท"
}
`;

    const requestBody = {
      contents: [
        {
          parts: [
            { text: systemPrompt },
            {
              inlineData: {
                mimeType: mimeType,
                data: rawData
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json"
      }
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const message = errData.error?.message || `HTTP ${response.status}: ${response.statusText}`;
      throw new Error(message);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    if (!candidate || !candidate.content?.parts?.[0]?.text) {
      throw new Error('ไม่พบข้อมูลผลลัพธ์จาก Gemini Flash Lite 3.5');
    }

    const jsonText = candidate.content.parts[0].text.trim();
    return JSON.parse(jsonText);
  }

  /**
   * Export records to CSV format
   */
  function exportRecordsToCSV(records) {
    if (!records || records.length === 0) {
      window.RoofUI.showToast('ไม่มีข้อมูลสำหรับส่งออก', 'error');
      return;
    }

    const headers = ['ID', 'วันที่สำรวจ', 'ชื่อสถานที่', 'ประเภทหลังคา', 'รหัสประเภท', 'พื้นที่ (ตร.ม.)', 'ความมั่นใจ (%)', 'รูปทรง', 'สี', 'สภาพ', 'บันทึกวิเคราะห์'];
    const rows = records.map(r => [
      `"${r.id}"`,
      `"${r.timestamp}"`,
      `"${(r.title || '').replace(/"/g, '""')}"`,
      `"${(r.roofTypeName || '').replace(/"/g, '""')}"`,
      `"${r.roofTypeId}"`,
      r.estimatedAreaSqM,
      r.confidence,
      `"${(r.slopeType || '').replace(/"/g, '""')}"`,
      `"${(r.color || '').replace(/"/g, '""')}"`,
      `"${(r.condition || '').replace(/"/g, '""')}"`,
      `"${(r.analysisNotes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `roof_survey_report_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    window.RoofUI.showToast('ส่งออกไฟล์ CSV สำเร็จ', 'success');
  }

  /**
   * Initialize Global Event Delegation
   */
  function initEventHandlers() {
    // 1. Bottom Navigation Tabs
    document.querySelectorAll('.bottom-nav .nav-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetTab = btn.dataset.tab;
        window.RoofStore.setActiveTab(targetTab);
      });
    });

    // 2. Settings Modal Open/Close
    const btnOpenSettings = document.getElementById('btn-open-settings');
    const btnCloseSettings = document.getElementById('btn-close-settings');
    const modalSettings = document.getElementById('modal-settings');
    const btnSaveKey = document.getElementById('btn-save-key');
    const inputApiKey = document.getElementById('input-api-key');

    if (btnOpenSettings && modalSettings) {
      btnOpenSettings.addEventListener('click', () => {
        inputApiKey.value = window.RoofStore.getApiKey();
        modalSettings.classList.remove('hidden');
      });
    }

    if (btnCloseSettings && modalSettings) {
      btnCloseSettings.addEventListener('click', () => {
        modalSettings.classList.add('hidden');
      });
    }

    if (btnSaveKey && inputApiKey && modalSettings) {
      btnSaveKey.addEventListener('click', () => {
        const key = inputApiKey.value.trim();
        window.RoofStore.setApiKey(key);
        modalSettings.classList.add('hidden');
        if (key) {
          window.RoofUI.showToast('บันทึก Gemini API Key เรียบร้อย', 'success');
        } else {
          window.RoofUI.showToast('ล้างค่า API Key แล้ว', 'info');
        }
      });
    }

    // Close modal on click outside
    if (modalSettings) {
      modalSettings.addEventListener('click', (e) => {
        if (e.target === modalSettings) {
          modalSettings.classList.add('hidden');
        }
      });
    }

    // 3. Main Content Dynamic Event Delegation
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;

    // File Input change handler (Delegated)
    mainContent.addEventListener('change', async (e) => {
      if (e.target && e.target.id === 'input-satellite-file') {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
          window.RoofUI.setLoading(true, 'กำลังปรับขนาดภาพสำหรับมือถือ...');
          const compressed = await compressImage(file);
          window.RoofStore.setPreviewImage(compressed);
          window.RoofUI.showToast('โหลดภาพถ่ายดาวเทียมเรียบร้อย', 'success');
        } catch (err) {
          console.error('[App] Image loading failed:', err);
          window.RoofUI.showToast('ไม่สามารถประมวลผลไฟล์ภาพนี้ได้', 'error');
        } finally {
          window.RoofUI.setLoading(false);
        }
      }
    });

    // Input Location Name tracking
    mainContent.addEventListener('input', (e) => {
      if (e.target && e.target.id === 'input-location-title') {
        window.RoofStore.setLocationName(e.target.value);
      }
    });

    // Click Events in Main Content
    mainContent.addEventListener('click', async (e) => {
      const target = e.target;

      // Tap dropzone to open hidden file input
      const dropzone = target.closest('#dropzone-satellite');
      if (dropzone && e.target.id !== 'input-satellite-file') {
        const fileInput = document.getElementById('input-satellite-file');
        if (fileInput) fileInput.click();
        return;
      }

      // Remove Preview Image
      if (target.closest('#btn-remove-preview') || target.closest('#btn-cancel-record')) {
        window.RoofStore.clearCurrentAnalysis();
        return;
      }

      // Start AI Analysis
      if (target.closest('#btn-run-analysis')) {
        const state = window.RoofStore.getState();
        if (!state.previewImageBase64) {
          window.RoofUI.showToast('กรุณาเลือกภาพถ่ายดาวเทียมก่อน', 'error');
          return;
        }

        const apiKey = window.RoofStore.getApiKey();
        if (!apiKey) {
          window.RoofUI.showToast('กรุณากรอก Gemini API Key ที่มุมขวาบนก่อนใช้งาน', 'error');
          if (modalSettings) {
            inputApiKey.value = '';
            modalSettings.classList.remove('hidden');
          }
          return;
        }

        try {
          window.RoofUI.setLoading(true, `กำลังส่งภาพตรวจสอบกับ ${GEMINI_MODEL}...`);
          const result = await analyzeRoofWithGemini(state.previewImageBase64, apiKey);
          window.RoofStore.setCurrentAnalysis(result);
          window.RoofUI.showToast('จำแนกประเภทหลังคาสำเร็จ!', 'success');
        } catch (err) {
          console.error('[App] Gemini analysis error:', err);
          window.RoofUI.showToast(`เกิดข้อผิดพลาด: ${err.message}`, 'error');
        } finally {
          window.RoofUI.setLoading(false);
        }
        return;
      }

      // Save Current Analysis Record
      if (target.closest('#btn-save-record')) {
        const saved = window.RoofStore.saveCurrentRecord();
        if (saved) {
          window.RoofUI.showToast(`บันทึกข้อมูล ${saved.roofTypeName} สำเร็จ`, 'success');
          // Navigate to records tab to see newly created item
          window.RoofStore.setActiveTab('records');
        }
        return;
      }

      // Filter Chips in Records View
      const filterChip = target.closest('.filter-chip');
      if (filterChip && filterChip.dataset.filter) {
        window.RoofStore.setSelectedFilter(filterChip.dataset.filter);
        return;
      }

      // Delete Record
      const delBtn = target.closest('.btn-delete-record');
      if (delBtn && delBtn.dataset.deleteId) {
        const id = delBtn.dataset.deleteId;
        if (confirm('ต้องการลบข้อมูลการสำรวจนี้ใช่หรือไม่?')) {
          window.RoofStore.deleteRecord(id);
          window.RoofUI.showToast('ลบรายการสำรวจเรียบร้อย', 'info');
        }
        return;
      }

      // Export CSV
      if (target.closest('#btn-export-csv')) {
        const state = window.RoofStore.getState();
        exportRecordsToCSV(state.records);
        return;
      }

      // Clear All Records
      if (target.closest('#btn-clear-all')) {
        if (confirm('ต้องการล้างข้อมูลการสำรวจทั้งหมดใช่หรือไม่? ไม่สามารถกู้คืนได้')) {
          window.RoofStore.clearAllRecords();
          window.RoofUI.showToast('ล้างข้อมูลทั้งหมดแล้ว', 'info');
        }
        return;
      }
    });
  }

  /**
   * App Bootstrap Lifecycle
   */
  document.addEventListener('DOMContentLoaded', () => {
    // 1. Subscribe UI to Store state modifications
    window.RoofStore.subscribe((state) => {
      window.RoofUI.render(state);
    });

    // 2. Initialize Data Store
    window.RoofStore.init();

    // 3. Attach Event Listeners
    initEventHandlers();

    // 4. Check if API key is present; if not, suggest configuring it
    if (!window.RoofStore.hasApiKey()) {
      setTimeout(() => {
        window.RoofUI.showToast('ยินดีต้อนรับ! แตะที่รูปฟันเฟืองเพื่อใส่ API Key ก่อนเริ่มใช้งาน', 'info');
      }, 800);
    }
  });

})();
