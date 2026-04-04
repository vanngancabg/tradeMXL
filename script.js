const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzSK9fFi4o6RVG89DJe6TpE1w8XCRUc6wfj8poC2alAuPZ23uOx7dPNVqXWkqqJ47Y4ZQ/exec";

const NEED_ITEMS_PER_PAGE = 10;
const HAVE_ITEMS_PER_PAGE = 15;
const COOLDOWN_MS = 5 * 60 * 1000;
const COOLDOWN_STORAGE_KEY = "mxl_global_cooldown_until";

const needForm = document.getElementById("needForm");
const haveForm = document.getElementById("haveForm");

const needTableBody = document.getElementById("needTableBody");
const haveTableBody = document.getElementById("haveTableBody");

const muleRowsContainer = document.getElementById("muleRowsContainer");
const addMuleRowBtn = document.getElementById("addMuleRowBtn");

const needSearchInput = document.getElementById("needSearchInput");
const haveTypeFilter = document.getElementById("haveTypeFilter");

const needFirstBtn = document.getElementById("needFirstBtn");
const needPrevBtn = document.getElementById("needPrevBtn");
const needNextBtn = document.getElementById("needNextBtn");
const needLastBtn = document.getElementById("needLastBtn");
const needPageInfo = document.getElementById("needPageInfo");

const haveFirstBtn = document.getElementById("haveFirstBtn");
const havePrevBtn = document.getElementById("havePrevBtn");
const haveNextBtn = document.getElementById("haveNextBtn");
const haveLastBtn = document.getElementById("haveLastBtn");
const havePageInfo = document.getElementById("havePageInfo");

const needCooldownNote = document.getElementById("needCooldownNote");
const haveCooldownNote = document.getElementById("haveCooldownNote");

let needListCache = [];
let haveListCache = [];

let currentNeedPage = 1;
let currentHavePage = 1;
let cooldownTimer = null;

function escapeHtml(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDisplayDate(dateValue) {
  if (!dateValue) return "";

  const date = new Date(dateValue);

  if (isNaN(date.getTime())) {
    return String(dateValue);
  }

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

function isValidVietnamPhone(phone) {
  const normalized = String(phone || "").trim();
  return /^(0)(3|5|7|8|9)\d{8}$/.test(normalized);
}

function isValidMxlMuleLink(link) {
  const normalized = String(link || "").trim();

  return (
    normalized.startsWith("https://median-xl.com/char/") ||
    normalized.startsWith("https://median-xl.com/acc/") ||
    normalized.startsWith("https://tsw.vn.cz/char")
  );
}

function isMeaningfulText(text, minLength = 2) {
  const normalized = String(text || "").trim();
  const compact = normalized.replace(/\s+/g, "");

  if (compact.length < minLength) return false;

  const validChars = compact.match(/[A-Za-zÀ-ỹ0-9]/g) || [];
  if (validChars.length < minLength) return false;

  if (/^(.)\1+$/.test(compact)) return false;
  if (/^[^A-Za-zÀ-ỹ0-9]+$/.test(compact)) return false;

  return true;
}

function normalizeLink(link) {
  return String(link || "").trim().toLowerCase();
}

function buildZaloLink(phone) {
  const normalizedPhone = String(phone || "").trim().replace(/\D/g, "");
  return `https://zalo.me/${normalizedPhone}`;
}

async function copyPhoneNumber(phone, buttonElement) {
  const normalizedPhone = String(phone || "").trim().replace(/\D/g, "");

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(normalizedPhone);
    } else {
      const tempInput = document.createElement("input");
      tempInput.value = normalizedPhone;
      document.body.appendChild(tempInput);
      tempInput.select();
      document.execCommand("copy");
      document.body.removeChild(tempInput);
    }

    if (buttonElement) {
      const originalText = buttonElement.dataset.originalText || "Copy";
      buttonElement.dataset.originalText = originalText;
      buttonElement.textContent = "Đã copy";
      buttonElement.classList.add("copied");

      clearTimeout(buttonElement._copyTimer);
      buttonElement._copyTimer = setTimeout(() => {
        buttonElement.textContent = originalText;
        buttonElement.classList.remove("copied");
      }, 1500);
    }
  } catch (error) {
    console.error("Không sao chép được số điện thoại:", error);

    if (buttonElement) {
      const originalText = buttonElement.dataset.originalText || "Copy";
      buttonElement.textContent = "Lỗi copy";
      clearTimeout(buttonElement._copyTimer);
      buttonElement._copyTimer = setTimeout(() => {
        buttonElement.textContent = originalText;
      }, 1500);
    }
  }
}

function formatRemainingTime(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function getCooldownUntil() {
  const value = Number(localStorage.getItem(COOLDOWN_STORAGE_KEY) || 0);
  return Number.isFinite(value) ? value : 0;
}

function getCooldownRemainingMs() {
  return Math.max(0, getCooldownUntil() - Date.now());
}

function setCooldownUntil(timestamp) {
  localStorage.setItem(COOLDOWN_STORAGE_KEY, String(timestamp));
}

function clearCooldown() {
  localStorage.removeItem(COOLDOWN_STORAGE_KEY);
}

function setFormsDisabled(isDisabled) {
  const needSubmitButton = needForm.querySelector("button[type='submit']");
  const haveSubmitButton = haveForm.querySelector("button[type='submit']");

  needSubmitButton.disabled = isDisabled;
  haveSubmitButton.disabled = isDisabled;
  addMuleRowBtn.disabled = isDisabled;
}

function updateCooldownUI() {
  const remainingMs = getCooldownRemainingMs();

  if (remainingMs <= 0) {
    clearCooldown();
    setFormsDisabled(false);
    needCooldownNote.textContent = "";
    haveCooldownNote.textContent = "";
    needCooldownNote.classList.remove("is-active");
    haveCooldownNote.classList.remove("is-active");
    return;
  }

  const countdownText = `Bạn cần chờ ${formatRemainingTime(remainingMs)} nữa mới được gửi thông tin tiếp.`;
  setFormsDisabled(true);

  needCooldownNote.textContent = countdownText;
  haveCooldownNote.textContent = countdownText;
  needCooldownNote.classList.add("is-active");
  haveCooldownNote.classList.add("is-active");
}

function startCooldown(durationMs) {
  const until = Date.now() + durationMs;
  setCooldownUntil(until);
  updateCooldownUI();
}

function ensureCooldownTimer() {
  if (cooldownTimer) return;
  cooldownTimer = setInterval(updateCooldownUI, 1000);
}

function createMuleRowHtml(disabled = false) {
  return `
    <div class="mule-row">
      <div class="form-group">
        <label>Link Mule chứa đồ</label>
        <input type="url" class="mule-link-input" placeholder="Dán link Mule ở đây" required />
      </div>

      <div class="form-group">
        <label>Loại Mule</label>
        <select class="have-type-select" required>
          <option value="">-- Chọn loại Mule --</option>
          <option value="Đồ set xanh">Đồ set xanh</option>
          <option value="Đồ SU - SSU">Đồ SU - SSU</option>
          <option value="UMO - Relic">UMO - Relic</option>
          <option value="Charm">Charm</option>
          <option value="Khác">Khác</option>
        </select>
      </div>

      <div class="mule-row-action">
        <button type="button" class="btn-remove-row" ${disabled ? "disabled" : ""}>Xóa dòng</button>
      </div>
    </div>
  `;
}

function updateRemoveButtonsState() {
  const removeButtons = muleRowsContainer.querySelectorAll(".btn-remove-row");
  const hasOnlyOneRow = removeButtons.length === 1;

  removeButtons.forEach((button) => {
    button.disabled = hasOnlyOneRow || getCooldownRemainingMs() > 0;
  });
}

function addMuleRow() {
  if (getCooldownRemainingMs() > 0) {
    alert(`Bạn cần chờ ${formatRemainingTime(getCooldownRemainingMs())} nữa mới được thao tác gửi tiếp.`);
    return;
  }

  muleRowsContainer.insertAdjacentHTML("beforeend", createMuleRowHtml(false));
  updateRemoveButtonsState();
}

function resetMuleRows() {
  muleRowsContainer.innerHTML = createMuleRowHtml(true);
  updateRemoveButtonsState();
}

function getMuleRows() {
  return Array.from(muleRowsContainer.querySelectorAll(".mule-row"));
}

function collectMuleEntries() {
  return getMuleRows().map((row) => {
    const muleLink = row.querySelector(".mule-link-input")?.value.trim() || "";
    const haveType = row.querySelector(".have-type-select")?.value.trim() || "";

    return { muleLink, haveType };
  });
}

function getFilteredNeedList() {
  const keyword = (needSearchInput?.value || "").trim().toLowerCase();

  if (!keyword) {
    return needListCache;
  }

  return needListCache.filter((item) =>
    String(item.itemName || "").toLowerCase().includes(keyword)
  );
}

function getFilteredHaveList() {
  const selectedType = (haveTypeFilter?.value || "").trim();

  if (!selectedType) {
    return haveListCache;
  }

  return haveListCache.filter(
    (item) => String(item.haveType || "").trim() === selectedType
  );
}

function paginateList(list, currentPage, itemsPerPage) {
  const totalItems = list.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const safePage = Math.min(Math.max(currentPage, 1), totalPages);
  const startIndex = (safePage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;

  return {
    pageItems: list.slice(startIndex, endIndex),
    totalPages,
    currentPage: safePage
  };
}

function updateNeedPagination(totalPages, currentPage) {
  needPageInfo.textContent = `Trang ${currentPage} / ${totalPages}`;

  needFirstBtn.disabled = currentPage === 1;
  needPrevBtn.disabled = currentPage === 1;
  needNextBtn.disabled = currentPage === totalPages;
  needLastBtn.disabled = currentPage === totalPages;
}

function updateHavePagination(totalPages, currentPage) {
  havePageInfo.textContent = `Trang ${currentPage} / ${totalPages}`;

  haveFirstBtn.disabled = currentPage === 1;
  havePrevBtn.disabled = currentPage === 1;
  haveNextBtn.disabled = currentPage === totalPages;
  haveLastBtn.disabled = currentPage === totalPages;
}

function renderNeedTableRows() {
  const filteredList = getFilteredNeedList();
  const pagination = paginateList(filteredList, currentNeedPage, NEED_ITEMS_PER_PAGE);

  currentNeedPage = pagination.currentPage;
  updateNeedPagination(pagination.totalPages, pagination.currentPage);

  if (!filteredList.length) {
    needTableBody.innerHTML = `
      <tr>
        <td colspan="5" class="empty-row">Không có dữ liệu phù hợp với từ khóa tìm kiếm.</td>
      </tr>
    `;
    return;
  }

  const startNumber = (pagination.currentPage - 1) * NEED_ITEMS_PER_PAGE;

  needTableBody.innerHTML = pagination.pageItems
    .map((item, index) => `
      <tr>
        <td>${startNumber + index + 1}</td>
        <td>${escapeHtml(formatDisplayDate(item.time))}</td>
        <td>${escapeHtml(item.itemName)}</td>
        <td>${escapeHtml(item.name || "Ẩn danh")}</td>
        <td>
  <td>
  <div class="phone-cell">
    <a class="phone-link" href="${escapeHtml(buildZaloLink(item.phone))}" target="_blank" rel="noopener noreferrer">
      ${escapeHtml(item.phone)}
    </a>
    <button
      type="button"
      class="copy-phone-btn"
      data-original-text="Copy"
      onclick="copyPhoneNumber('${escapeHtml(item.phone)}', this)"
      title="Sao chép số điện thoại"
      aria-label="Sao chép số điện thoại"
    >
      Copy
    </button>
  </div>
</td>
      </tr>
    `)
    .join("");
}

function renderHaveTableRows() {
  const filteredList = getFilteredHaveList();
  const pagination = paginateList(filteredList, currentHavePage, HAVE_ITEMS_PER_PAGE);

  currentHavePage = pagination.currentPage;
  updateHavePagination(pagination.totalPages, pagination.currentPage);

  if (!filteredList.length) {
    haveTableBody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-row">Không có dữ liệu phù hợp với bộ lọc loại Mule.</td>
      </tr>
    `;
    return;
  }

  const startNumber = (pagination.currentPage - 1) * HAVE_ITEMS_PER_PAGE;

  haveTableBody.innerHTML = pagination.pageItems
    .map((item, index) => {
      const displayName = item.name && item.name.trim() ? item.name : "Không ghi tên";
      const displayType = item.haveType && item.haveType.trim() ? item.haveType : "Khác";
      const displayLink = item.muleLink || "";

      return `
        <tr>
          <td>${startNumber + index + 1}</td>
          <td>${escapeHtml(formatDisplayDate(item.time))}</td>
          <td>
            <a class="link-mule" href="${escapeHtml(displayLink)}" target="_blank" rel="noopener noreferrer">
              ${escapeHtml(displayLink)}
            </a>
          </td>
          <td>${escapeHtml(displayType)}</td>
          <td>${escapeHtml(displayName)}</td>
          <td>
  <td>
  <div class="phone-cell">
    <a class="phone-link" href="${escapeHtml(buildZaloLink(item.phone))}" target="_blank" rel="noopener noreferrer">
      ${escapeHtml(item.phone)}
    </a>
    <button
      type="button"
      class="copy-phone-btn"
      data-original-text="Copy"
      onclick="copyPhoneNumber('${escapeHtml(item.phone)}', this)"
      title="Sao chép số điện thoại"
      aria-label="Sao chép số điện thoại"
    >
      Copy
    </button>
  </div>
</td>
        </tr>
      `;
    })
    .join("");
}

function parseCooldownResult(result) {
  if (!result || result.code !== "COOLDOWN") return false;

  if (result.remainingSeconds) {
    startCooldown(result.remainingSeconds * 1000);
  }

  alert(result.message || "Bạn đang trong thời gian chờ gửi tiếp.");
  return true;
}

addMuleRowBtn.addEventListener("click", addMuleRow);

muleRowsContainer.addEventListener("click", function (event) {
  if (!event.target.classList.contains("btn-remove-row")) return;

  const rows = muleRowsContainer.querySelectorAll(".mule-row");
  if (rows.length <= 1) return;

  const row = event.target.closest(".mule-row");
  if (row) {
    row.remove();
    updateRemoveButtonsState();
  }
});

needSearchInput?.addEventListener("input", function () {
  currentNeedPage = 1;
  renderNeedTableRows();
});

haveTypeFilter?.addEventListener("change", function () {
  currentHavePage = 1;
  renderHaveTableRows();
});

needFirstBtn?.addEventListener("click", function () {
  currentNeedPage = 1;
  renderNeedTableRows();
});

needPrevBtn?.addEventListener("click", function () {
  currentNeedPage = Math.max(1, currentNeedPage - 1);
  renderNeedTableRows();
});

needNextBtn?.addEventListener("click", function () {
  currentNeedPage += 1;
  renderNeedTableRows();
});

needLastBtn?.addEventListener("click", function () {
  const totalPages = Math.max(1, Math.ceil(getFilteredNeedList().length / NEED_ITEMS_PER_PAGE));
  currentNeedPage = totalPages;
  renderNeedTableRows();
});

haveFirstBtn?.addEventListener("click", function () {
  currentHavePage = 1;
  renderHaveTableRows();
});

havePrevBtn?.addEventListener("click", function () {
  currentHavePage = Math.max(1, currentHavePage - 1);
  renderHaveTableRows();
});

haveNextBtn?.addEventListener("click", function () {
  currentHavePage += 1;
  renderHaveTableRows();
});

haveLastBtn?.addEventListener("click", function () {
  const totalPages = Math.max(1, Math.ceil(getFilteredHaveList().length / HAVE_ITEMS_PER_PAGE));
  currentHavePage = totalPages;
  renderHaveTableRows();
});

async function getData(action) {
  const url = `${APPS_SCRIPT_URL}?action=${encodeURIComponent(action)}`;
  const response = await fetch(url);
  return await response.json();
}

async function postData(bodyData) {
  const response = await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify(bodyData)
  });

  return await response.json();
}

async function renderNeedTable() {
  needTableBody.innerHTML = `
    <tr>
      <td colspan="5" class="empty-row">Đang tải dữ liệu...</td>
    </tr>
  `;

  try {
    const result = await getData("getNeedList");
    needListCache = (result.data || []).map((item) => ({
      ...item,
      name: item.name && String(item.name).trim() ? item.name : "Ẩn danh"
    }));
    currentNeedPage = 1;

    if (!needListCache.length) {
      needTableBody.innerHTML = `
        <tr>
          <td colspan="5" class="empty-row">Chưa có dữ liệu cần đồ.</td>
        </tr>
      `;
      updateNeedPagination(1, 1);
      return;
    }

    renderNeedTableRows();
  } catch (error) {
    needTableBody.innerHTML = `
      <tr>
        <td colspan="5" class="empty-row">Không tải được dữ liệu cần đồ.</td>
      </tr>
    `;
    console.error("Lỗi renderNeedTable:", error);
    updateNeedPagination(1, 1);
  }
}

async function renderHaveTable() {
  haveTableBody.innerHTML = `
    <tr>
      <td colspan="6" class="empty-row">Đang tải dữ liệu...</td>
    </tr>
  `;

  try {
    const result = await getData("getHaveList");
    haveListCache = result.data || [];
    currentHavePage = 1;

    if (!haveListCache.length) {
      haveTableBody.innerHTML = `
        <tr>
          <td colspan="6" class="empty-row">Chưa có dữ liệu có đồ.</td>
        </tr>
      `;
      updateHavePagination(1, 1);
      return;
    }

    renderHaveTableRows();
  } catch (error) {
    haveTableBody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-row">Không tải được dữ liệu có đồ.</td>
      </tr>
    `;
    console.error("Lỗi renderHaveTable:", error);
    updateHavePagination(1, 1);
  }
}

needForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  const submitButton = needForm.querySelector("button[type='submit']");
  submitButton.disabled = true;
  submitButton.textContent = "Đang gửi...";

  const rawName = document.getElementById("needName").value.trim();
  const name = rawName || "Ẩn danh";
  const phone = document.getElementById("needPhone").value.trim();
  const itemName = document.getElementById("needItem").value.trim();

  if (getCooldownRemainingMs() > 0) {
    alert(`Bạn cần chờ ${formatRemainingTime(getCooldownRemainingMs())} nữa mới được gửi tiếp.`);
    submitButton.disabled = false;
    submitButton.textContent = "Nhập thông tin";
    return;
  }

  if (!phone) {
    alert("Bạn chưa nhập Số điện thoại Zalo ở mục cần đồ.");
    submitButton.disabled = false;
    submitButton.textContent = "Nhập thông tin";
    return;
  }

  if (!isValidVietnamPhone(phone)) {
    alert("Số điện thoại Zalo ở mục cần đồ phải là số điện thoại hợp lệ của Việt Nam.");
    submitButton.disabled = false;
    submitButton.textContent = "Nhập thông tin";
    return;
  }

  if (rawName && !isMeaningfulText(rawName, 2)) {
    alert("Họ tên người cần quá ngắn hoặc có dấu hiệu là ký tự rác.");
    submitButton.disabled = false;
    submitButton.textContent = "Nhập thông tin";
    return;
  }

  if (!itemName) {
    alert("Bạn chưa nhập Tên đồ cần.");
    submitButton.disabled = false;
    submitButton.textContent = "Nhập thông tin";
    return;
  }

  if (!isMeaningfulText(itemName, 2)) {
    alert("Tên đồ cần quá ngắn hoặc có dấu hiệu là ký tự rác.");
    submitButton.disabled = false;
    submitButton.textContent = "Nhập thông tin";
    return;
  }

  try {
    const result = await postData({
      action: "addNeedItem",
      payload: {
        name,
        phone,
        itemName
      }
    });

    if (!result.success) {
      if (parseCooldownResult(result)) {
        submitButton.textContent = "Nhập thông tin";
        return;
      }
      throw new Error(result.message || "Không thể gửi dữ liệu");
    }

    needForm.reset();
    startCooldown(COOLDOWN_MS);
    await renderNeedTable();
    alert("Đã gửi thông tin cần đồ thành công.");
  } catch (error) {
    console.error("Lỗi gửi needForm:", error);
    alert("Gửi dữ liệu thất bại ở mục cần đồ: " + error.message);
  } finally {
    submitButton.disabled = getCooldownRemainingMs() > 0;
    submitButton.textContent = "Nhập thông tin";
    updateCooldownUI();
  }
});

haveForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  const submitButton = haveForm.querySelector("button[type='submit']");
  submitButton.disabled = true;
  submitButton.textContent = "Đang gửi...";

  const rawName = document.getElementById("haveName").value.trim();
  const name = rawName;
  const phone = document.getElementById("havePhone").value.trim();
  const muleEntries = collectMuleEntries();

  if (getCooldownRemainingMs() > 0) {
    alert(`Bạn cần chờ ${formatRemainingTime(getCooldownRemainingMs())} nữa mới được gửi tiếp.`);
    submitButton.disabled = false;
    submitButton.textContent = "Nhập thông tin Mule";
    return;
  }

  if (!phone) {
    alert("Bạn chưa nhập Số điện thoại Zalo ở mục có đồ.");
    submitButton.disabled = false;
    submitButton.textContent = "Nhập thông tin Mule";
    return;
  }

  if (!isValidVietnamPhone(phone)) {
    alert("Số điện thoại Zalo ở mục có đồ phải là số điện thoại hợp lệ của Việt Nam.");
    submitButton.disabled = false;
    submitButton.textContent = "Nhập thông tin Mule";
    return;
  }

  if (rawName && !isMeaningfulText(rawName, 2)) {
    alert("Tên chủ sở hữu quá ngắn hoặc có dấu hiệu là ký tự rác.");
    submitButton.disabled = false;
    submitButton.textContent = "Nhập thông tin Mule";
    return;
  }

  if (!muleEntries.length) {
    alert("Bạn phải nhập ít nhất 1 dòng gồm Link Mule và Loại Mule.");
    submitButton.disabled = false;
    submitButton.textContent = "Nhập thông tin Mule";
    return;
  }

  const hasCompletelyEmptyRows = muleEntries.some(
    (entry) => !entry.muleLink && !entry.haveType
  );

  if (hasCompletelyEmptyRows) {
    alert("Có dòng Mule đang để trống. Bạn hãy điền đầy đủ hoặc xóa dòng đó đi.");
    submitButton.disabled = false;
    submitButton.textContent = "Nhập thông tin Mule";
    return;
  }

  const hasInvalidRow = muleEntries.some(
    (entry) => !entry.muleLink || !entry.haveType
  );

  if (hasInvalidRow) {
    alert("Mỗi dòng Mule phải điền đầy đủ Link Mule và Loại Mule, hoặc xóa dòng đó đi.");
    submitButton.disabled = false;
    submitButton.textContent = "Nhập thông tin Mule";
    return;
  }

  const hasInvalidMxlLink = muleEntries.some(
    (entry) => !isValidMxlMuleLink(entry.muleLink)
  );

  if (hasInvalidMxlLink) {
    alert('Đường link không phải Link mule chứa đồ hợp lệ. Link hợp lệ phải bắt đầu bằng "https://median-xl.com/char/" hoặc "https://median-xl.com/acc/" hoặc "https://tsw.vn.cz/char".');
    submitButton.disabled = false;
    submitButton.textContent = "Nhập thông tin Mule";
    return;
  }

  const normalizedBatchLinks = muleEntries.map((entry) => normalizeLink(entry.muleLink));
  const batchLinkSet = new Set(normalizedBatchLinks);

  if (batchLinkSet.size !== normalizedBatchLinks.length) {
    alert("Trong một lần nhập đang có link Mule bị trùng nhau. Bạn hãy xóa link trùng rồi gửi lại.");
    submitButton.disabled = false;
    submitButton.textContent = "Nhập thông tin Mule";
    return;
  }

  const existingLinkSet = new Set(
    haveListCache.map((item) => normalizeLink(item.muleLink))
  );

  const hasExistingDuplicate = normalizedBatchLinks.some((link) => existingLinkSet.has(link));

  if (hasExistingDuplicate) {
    alert("Đã tồn tại link Mule trùng trong bảng tổng hợp chung. Bạn không thể nhập lại link đã có.");
    submitButton.disabled = false;
    submitButton.textContent = "Nhập thông tin Mule";
    return;
  }

  try {
    const payload = {
      name,
      phone,
      entries: muleEntries
    };

    const result = await postData({
      action: "addHaveItem",
      payload
    });

    if (!result.success) {
      if (parseCooldownResult(result)) {
        submitButton.textContent = "Nhập thông tin Mule";
        return;
      }
      throw new Error(result.message || "Không thể gửi dữ liệu");
    }

    haveForm.reset();
    resetMuleRows();
    startCooldown(COOLDOWN_MS);
    await renderHaveTable();
    alert("Đã gửi thông tin có đồ thành công.");
  } catch (error) {
    console.error("Lỗi gửi haveForm:", error);
    alert("Gửi dữ liệu thất bại ở mục có đồ: " + error.message);
  } finally {
    submitButton.disabled = getCooldownRemainingMs() > 0;
    submitButton.textContent = "Nhập thông tin Mule";
    updateCooldownUI();
  }
});

ensureCooldownTimer();
updateRemoveButtonsState();
updateNeedPagination(1, 1);
updateHavePagination(1, 1);
updateCooldownUI();
renderNeedTable();
renderHaveTable();
