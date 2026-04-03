const NEED_STORAGE_KEY = "medianxl_need_list";
const HAVE_STORAGE_KEY = "medianxl_have_list";

const needForm = document.getElementById("needForm");
const haveForm = document.getElementById("haveForm");

const needTableBody = document.getElementById("needTableBody");
const haveTableBody = document.getElementById("haveTableBody");

function getCurrentDateTime() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = now.getFullYear();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");

  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

function loadData(key) {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
}

function saveData(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

function renderNeedTable() {
  const needList = loadData(NEED_STORAGE_KEY);

  if (needList.length === 0) {
    needTableBody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-row">Chưa có dữ liệu cần đồ.</td>
      </tr>
    `;
    return;
  }

  needTableBody.innerHTML = needList
    .map((item, index) => {
      return `
        <tr>
          <td>${index + 1}</td>
          <td>${item.time}</td>
          <td>${item.name}</td>
          <td>${item.phone}</td>
          <td>${item.itemName}</td>
          <td>
            <button class="btn-delete" onclick="deleteNeedItem('${item.id}')">Xóa</button>
          </td>
        </tr>
      `;
    })
    .join("");
}

function renderHaveTable() {
  const haveList = loadData(HAVE_STORAGE_KEY);

  if (haveList.length === 0) {
    haveTableBody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-row">Chưa có dữ liệu có đồ.</td>
      </tr>
    `;
    return;
  }

  haveTableBody.innerHTML = haveList
    .map((item, index) => {
      const displayName = item.name && item.name.trim() !== "" ? item.name : "Không ghi tên";

      return `
        <tr>
          <td>${index + 1}</td>
          <td>${item.time}</td>
          <td>${displayName}</td>
          <td>${item.phone}</td>
          <td>
            <a class="link-mule" href="${item.muleLink}" target="_blank" rel="noopener noreferrer">
              ${item.muleLink}
            </a>
          </td>
          <td>
            <button class="btn-delete" onclick="deleteHaveItem('${item.id}')">Xóa</button>
          </td>
        </tr>
      `;
    })
    .join("");
}

function deleteNeedItem(id) {
  const needList = loadData(NEED_STORAGE_KEY);
  const newList = needList.filter(item => item.id !== id);
  saveData(NEED_STORAGE_KEY, newList);
  renderNeedTable();
}

function deleteHaveItem(id) {
  const haveList = loadData(HAVE_STORAGE_KEY);
  const newList = haveList.filter(item => item.id !== id);
  saveData(HAVE_STORAGE_KEY, newList);
  renderHaveTable();
}

needForm.addEventListener("submit", function (event) {
  event.preventDefault();

  const name = document.getElementById("needName").value.trim();
  const phone = document.getElementById("needPhone").value.trim();
  const itemName = document.getElementById("needItem").value.trim();

  if (!name || !phone || !itemName) {
    alert("Vui lòng nhập đầy đủ thông tin ở mục cần đồ.");
    return;
  }

  const needList = loadData(NEED_STORAGE_KEY);

  const newItem = {
    id: Date.now().toString(),
    time: getCurrentDateTime(),
    name,
    phone,
    itemName
  };

  needList.unshift(newItem);
  saveData(NEED_STORAGE_KEY, needList);

  needForm.reset();
  renderNeedTable();
});

haveForm.addEventListener("submit", function (event) {
  event.preventDefault();

  const name = document.getElementById("haveName").value.trim();
  const phone = document.getElementById("havePhone").value.trim();
  const muleLink = document.getElementById("muleLink").value.trim();

  if (!phone || !muleLink) {
    alert("Vui lòng nhập đầy đủ thông tin ở mục có đồ.");
    return;
  }

  const haveList = loadData(HAVE_STORAGE_KEY);

  const newItem = {
    id: Date.now().toString(),
    time: getCurrentDateTime(),
    name,
    phone,
    muleLink
  };

  haveList.unshift(newItem);
  saveData(HAVE_STORAGE_KEY, haveList);

  haveForm.reset();
  renderHaveTable();
});

renderNeedTable();
renderHaveTable();
