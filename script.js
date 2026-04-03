const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw--ABnLBy2LRV1Emh2codqNxNXwuivDzniSNSplLhMhXrGf1tx7Xpuax4A97_-OYc1/exec";

const needForm = document.getElementById("needForm");
const haveForm = document.getElementById("haveForm");

const needTableBody = document.getElementById("needTableBody");
const haveTableBody = document.getElementById("haveTableBody");

function escapeHtml(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

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
      <td colspan="6" class="empty-row">Đang tải dữ liệu...</td>
    </tr>
  `;

  try {
    const result = await getData("getNeedList");
    const needList = result.data || [];

    if (!needList.length) {
      needTableBody.innerHTML = `
        <tr>
          <td colspan="6" class="empty-row">Chưa có dữ liệu cần đồ.</td>
        </tr>
      `;
      return;
    }

    needTableBody.innerHTML = needList
      .map((item, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(item.time)}</td>
          <td>${escapeHtml(item.itemName)}</td>
          <td>${escapeHtml(item.name)}</td>
          <td>${escapeHtml(item.phone)}</td>
          <td>
            <button class="btn-delete" onclick="deleteNeedItem('${escapeHtml(item.id)}')">Xóa</button>
          </td>
        </tr>
      `)
      .join("");
  } catch (error) {
    needTableBody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-row">Không tải được dữ liệu cần đồ.</td>
      </tr>
    `;
    console.error("Lỗi renderNeedTable:", error);
  }
}

async function renderHaveTable() {
  haveTableBody.innerHTML = `
    <tr>
      <td colspan="7" class="empty-row">Đang tải dữ liệu...</td>
    </tr>
  `;

  try {
    const result = await getData("getHaveList");
    const haveList = result.data || [];

    if (!haveList.length) {
      haveTableBody.innerHTML = `
        <tr>
          <td colspan="7" class="empty-row">Chưa có dữ liệu có đồ.</td>
        </tr>
      `;
      return;
    }

    haveTableBody.innerHTML = haveList
      .map((item, index) => {
        const displayName = item.name && item.name.trim() ? item.name : "Không ghi tên";
        const displayType = item.haveType && item.haveType.trim() ? item.haveType : "Khác";
        const displayLink = item.muleLink || "";

        return `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(item.time)}</td>
            <td>
              <a class="link-mule" href="${escapeHtml(displayLink)}" target="_blank" rel="noopener noreferrer">
                ${escapeHtml(displayLink)}
              </a>
            </td>
            <td>${escapeHtml(displayName)}</td>
            <td>${escapeHtml(item.phone)}</td>
            <td>${escapeHtml(displayType)}</td>
            <td>
              <button class="btn-delete" onclick="deleteHaveItem('${escapeHtml(item.id)}')">Xóa</button>
            </td>
          </tr>
        `;
      })
      .join("");
  } catch (error) {
    haveTableBody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-row">Không tải được dữ liệu có đồ.</td>
      </tr>
    `;
    console.error("Lỗi renderHaveTable:", error);
  }
}

needForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  const submitButton = needForm.querySelector("button[type='submit']");
  submitButton.disabled = true;
  submitButton.textContent = "Đang gửi...";

  const name = document.getElementById("needName").value.trim();
  const phone = document.getElementById("needPhone").value.trim();
  const itemName = document.getElementById("needItem").value.trim();

  if (!name || !phone || !itemName) {
    alert("Vui lòng nhập đầy đủ thông tin ở mục cần đồ.");
    submitButton.disabled = false;
    submitButton.textContent = "Gửi thông tin cần đồ";
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
      throw new Error(result.message || "Không thể gửi dữ liệu");
    }

    needForm.reset();
    await renderNeedTable();
    alert("Đã gửi thông tin cần đồ thành công.");
  } catch (error) {
    console.error("Lỗi gửi needForm:", error);
    alert("Gửi dữ liệu thất bại ở mục cần đồ.");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Gửi thông tin cần đồ";
  }
});

haveForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  const submitButton = haveForm.querySelector("button[type='submit']");
  submitButton.disabled = true;
  submitButton.textContent = "Đang gửi...";

  const name = document.getElementById("haveName").value.trim();
  const phone = document.getElementById("havePhone").value.trim();
  const haveType = document.getElementById("haveType").value.trim();
  const muleLink = document.getElementById("muleLink").value.trim();

  if (!phone || !haveType || !muleLink) {
    alert("Vui lòng nhập đầy đủ thông tin ở mục có đồ.");
    submitButton.disabled = false;
    submitButton.textContent = "Gửi thông tin có đồ";
    return;
  }

  try {
    const result = await postData({
      action: "addHaveItem",
      payload: {
        name,
        phone,
        haveType,
        muleLink
      }
    });

    if (!result.success) {
      throw new Error(result.message || "Không thể gửi dữ liệu");
    }

    haveForm.reset();
    await renderHaveTable();
    alert("Đã gửi thông tin có đồ thành công.");
  } catch (error) {
    console.error("Lỗi gửi haveForm:", error);
    alert("Gửi dữ liệu thất bại ở mục có đồ.");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Gửi thông tin có đồ";
  }
});

async function deleteNeedItem(id) {
  const confirmDelete = confirm("Bạn có chắc muốn xóa dòng này không?");
  if (!confirmDelete) return;

  try {
    const result = await postData({
      action: "deleteNeedItem",
      id
    });

    if (!result.success) {
      throw new Error(result.message || "Không thể xóa dữ liệu");
    }

    await renderNeedTable();
  } catch (error) {
    console.error("Lỗi xóa need item:", error);
    alert("Xóa dữ liệu thất bại.");
  }
}

async function deleteHaveItem(id) {
  const confirmDelete = confirm("Bạn có chắc muốn xóa dòng này không?");
  if (!confirmDelete) return;

  try {
    const result = await postData({
      action: "deleteHaveItem",
      id
    });

    if (!result.success) {
      throw new Error(result.message || "Không thể xóa dữ liệu");
    }

    await renderHaveTable();
  } catch (error) {
    console.error("Lỗi xóa have item:", error);
    alert("Xóa dữ liệu thất bại.");
  }
}

renderNeedTable();
renderHaveTable();
