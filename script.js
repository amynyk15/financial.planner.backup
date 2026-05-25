document.addEventListener("DOMContentLoaded", () => {
  // 全局数据存储 (用于同步)
  let globalData = {
    incomes: [],
    expenses: [],
    goals: [],
    products: [],
    folders: [],
    creditCards: [
      {
        holder: "Stefania Nord",
        number: "•••• •••• •••• 7899",
        expiry: "05/24",
        balance: 1425,
      },
    ],
    user: { name: "Stefania Nord", avatar: "https://via.placeholder.com/40" },
    budgetByMonth: {}, // { '2025-1': { incomes: [], expenses: [] } }
  };

  // 从 localStorage 加载数据
  function loadData() {
    const savedData = JSON.parse(localStorage.getItem("financeData")) || {};
    globalData = { ...globalData, ...savedData };
    updateAllUI();
  }

  // 保存到 localStorage
  function saveData() {
    localStorage.setItem("financeData", JSON.stringify(globalData));
    updateAllUI();
  }

  // 更新所有 UI (同步数据)
  function updateAllUI() {
    updateBudgetSummary();
    updateDashboardSummary();
    updateSidebarSummary();
    updateUserProfile();
    renderGoals(); // 同步到 Dashboard 和 Savings
  }

  // 更新用户资料
  function updateUserProfile() {
    document.getElementById("user-name").textContent = globalData.user.name;
    document.getElementById("user-avatar").src = globalData.user.avatar;
  }

  // 更新 Dashboard 汇总
  function updateDashboardSummary() {
    const totalIncome = globalData.incomes.reduce(
      (sum, i) => sum + i.amount,
      0
    );
    const totalExpenses = globalData.expenses.reduce(
      (sum, e) => sum + e.amount,
      0
    );
    const balance = totalIncome - totalExpenses;

    document.getElementById(
      "dashboard-balance"
    ).textContent = `$${balance.toFixed(2)}`;
    document.getElementById(
      "chart-income"
    ).textContent = `$${totalIncome.toFixed(2)}`;
    document.getElementById(
      "chart-expenses"
    ).textContent = `$${totalExpenses.toFixed(2)}`;
    document.getElementById("chart-balance").textContent = `$${balance.toFixed(
      2
    )}`;

    // 同步信用卡 (显示第一张)
    if (globalData.creditCards.length > 0) {
      const card = globalData.creditCards[0];
      document.getElementById("card-holder").textContent = card.holder;
      document.getElementById("card-number").textContent = card.number;
      document.getElementById("card-expiry").textContent = card.expiry;
      document.getElementById(
        "card-balance"
      ).textContent = `$${card.balance.toFixed(2)}`;
    }
  }

  // 更新侧边栏汇总
  function updateSidebarSummary() {
    const totalIncome = globalData.incomes.reduce(
      (sum, i) => sum + i.amount,
      0
    );
    const totalExpenses = globalData.expenses.reduce(
      (sum, e) => sum + e.amount,
      0
    );
    const balance = totalIncome - totalExpenses;

    document.getElementById(
      "sidebar-total-income"
    ).textContent = `$${totalIncome.toFixed(2)}`;
    document.getElementById(
      "sidebar-total-expenses"
    ).textContent = `$${totalExpenses.toFixed(2)}`;
    document.getElementById(
      "sidebar-balance"
    ).textContent = `$${balance.toFixed(2)}`;
  }

  // 1. 页面切换逻辑
  const navLinks = document.querySelectorAll(".sidebar-menu a");
  const pages = document.querySelectorAll(".page");

  navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();

      // 移除所有active类
      navLinks.forEach((l) => l.classList.remove("active"));
      pages.forEach((p) => p.classList.remove("active"));

      // 添加active类
      link.classList.add("active");
      const targetId = link.getAttribute("href");
      document.querySelector(targetId).classList.add("active");

      // 页面特定加载
      if (targetId === "#budget") loadBudgetForMonth();
      if (targetId === "#savings") renderGoals();
      if (targetId === "#shopping") renderShopping();
      if (targetId === "#settings") loadSettings();
    });
  });

  // 2. 初始化支出图表
  const ctx = document.getElementById("expenseChart").getContext("2d");
  new Chart(ctx, {
    type: "line",
    data: {
      labels: ["1", "5", "10", "15", "20", "25", "30"],
      datasets: [
        {
          label: "Balance",
          data: [1000, 1200, 900, 1500, 1300, 1800, 1978.5],
          borderColor: "#8A7CFB",
          backgroundColor: "rgba(138, 124, 251, 0.1)",
          tension: 0.4,
          fill: true,
        },
        {
          label: "Expenses",
          data: [800, 1000, 1200, 900, 1100, 800, 600],
          borderColor: "#FFB74D",
          backgroundColor: "rgba(255, 183, 77, 0.1)",
          tension: 0.4,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "top",
        },
        tooltip: {
          mode: "index",
          intersect: false,
          callbacks: {
            label: function (context) {
              return `${context.dataset.label}: $${context.raw}`;
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function (value) {
              return "$" + value;
            },
          },
        },
      },
    },
  });

  // 3. 预算规划器逻辑 (优化: 分年月)
  const addIncomeBtn = document.querySelector(".add-income");
  const addExpenseBtn = document.querySelector(".add-expense");
  const incomeList = document.querySelector(".income-list");
  const expenseList = document.querySelector(".expense-list");
  const totalIncomeEl = document.getElementById("total-income");
  const totalExpensesEl = document.getElementById("total-expenses");
  const projectedSavingsEl = document.getElementById("projected-savings");
  const budgetYearSelect = document.getElementById("budget-year");
  const budgetMonthSelect = document.getElementById("budget-month");

  // 动态填充年份 (当前年 ±5)
  for (
    let y = new Date().getFullYear() - 5;
    y <= new Date().getFullYear() + 5;
    y++
  ) {
    const option = document.createElement("option");
    option.value = y;
    option.textContent = y;
    budgetYearSelect.appendChild(option);
  }
  budgetYearSelect.value = new Date().getFullYear();
  budgetMonthSelect.value = new Date().getMonth() + 1;

  // 加载指定年月预算
  function loadBudgetForMonth() {
    const key = `${budgetYearSelect.value}-${budgetMonthSelect.value}`;
    const monthData = globalData.budgetByMonth[key] || {
      incomes: [],
      expenses: [],
    };
    globalData.incomes = monthData.incomes;
    globalData.expenses = monthData.expenses;
    renderIncomeList();
    renderExpenseList();
    updateBudgetSummary();
  }

  // 保存当前预算到年月
  function saveBudgetForMonth() {
    const key = `${budgetYearSelect.value}-${budgetMonthSelect.value}`;
    globalData.budgetByMonth[key] = {
      incomes: globalData.incomes,
      expenses: globalData.expenses,
    };
    saveData();
  }

  budgetYearSelect.addEventListener("change", loadBudgetForMonth);
  budgetMonthSelect.addEventListener("change", loadBudgetForMonth);

  // 添加收入
  addIncomeBtn.addEventListener("click", () => {
    const sourceInput = document.querySelector(
      '.budget-section:first-child input[type="text"]'
    );
    const amountInput = document.querySelector(
      '.budget-section:first-child input[type="number"]'
    );

    const source = sourceInput.value.trim();
    const amount = parseFloat(amountInput.value);

    if (!source || isNaN(amount) || amount <= 0) {
      alert("Please enter a valid income source and amount");
      return;
    }

    globalData.incomes.push({ source, amount });
    renderIncomeList();
    sourceInput.value = "";
    amountInput.value = "";
    updateBudgetSummary();
    saveBudgetForMonth();
  });

  // 添加支出
  addExpenseBtn.addEventListener("click", () => {
    const categorySelect = document.querySelector(
      ".budget-section:nth-child(2) select"
    );
    const amountInput = document.querySelector(
      '.budget-section:nth-child(2) input[type="number"]'
    );

    const category = categorySelect.value;
    const amount = parseFloat(amountInput.value);

    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid expense amount");
      return;
    }

    globalData.expenses.push({ category, amount });
    renderExpenseList();
    amountInput.value = "";
    updateBudgetSummary();
    saveBudgetForMonth();
  });

  // 渲染收入列表
  function renderIncomeList() {
    incomeList.innerHTML = "";
    globalData.incomes.forEach((item, index) => {
      const incomeItem = document.createElement("div");
      incomeItem.className = "transaction-item";
      incomeItem.innerHTML = `
                <span>${item.source}</span>
                <span class="amount income">+$${item.amount.toFixed(2)}</span>
                <button class="more-btn delete-income"><i class="fas fa-trash"></i></button>
            `;
      incomeItem
        .querySelector(".delete-income")
        .addEventListener("click", () => {
          globalData.incomes.splice(index, 1);
          renderIncomeList();
          updateBudgetSummary();
          saveBudgetForMonth();
        });
      incomeList.appendChild(incomeItem);
    });
  }

  // 渲染支出列表
  function renderExpenseList() {
    expenseList.innerHTML = "";
    globalData.expenses.forEach((item, index) => {
      const expenseItem = document.createElement("div");
      expenseItem.className = "transaction-item";
      expenseItem.innerHTML = `
                <span>${item.category}</span>
                <span class="amount expense">-$${item.amount.toFixed(2)}</span>
                <button class="more-btn delete-expense"><i class="fas fa-trash"></i></button>
            `;
      expenseItem
        .querySelector(".delete-expense")
        .addEventListener("click", () => {
          globalData.expenses.splice(index, 1);
          renderExpenseList();
          updateBudgetSummary();
          saveBudgetForMonth();
        });
      expenseList.appendChild(expenseItem);
    });
  }

  // 更新预算汇总
  function updateBudgetSummary() {
    const totalIncome = globalData.incomes.reduce(
      (sum, item) => sum + item.amount,
      0
    );
    const totalExpenses = globalData.expenses.reduce(
      (sum, item) => sum + item.amount,
      0
    );
    const projectedSavings = totalIncome - totalExpenses;

    totalIncomeEl.textContent = `$${totalIncome.toFixed(2)}`;
    totalExpensesEl.textContent = `$${totalExpenses.toFixed(2)}`;
    projectedSavingsEl.textContent = `$${projectedSavings.toFixed(2)}`;

    if (projectedSavings >= 0) {
      projectedSavingsEl.style.color = "#4CAF50";
    } else {
      projectedSavingsEl.style.color = "#FF5252";
    }
  }

  // 4. 实际支出页面逻辑
  const addTransactionBtn = document.getElementById("add-transaction-btn");
  const transactionForm = document.querySelector(".transaction-form");
  const closeTransactionForm = transactionForm.querySelector(".close-form");
  const saveTransactionBtn = transactionForm.querySelector(".save-transaction");
  const actualTransactionsList = document.getElementById(
    "actual-transactions-list"
  );

  // 打开交易表单
  addTransactionBtn.addEventListener("click", () => {
    transactionForm.classList.remove("hidden");
  });

  // 关闭交易表单
  closeTransactionForm.addEventListener("click", () => {
    transactionForm.classList.add("hidden");
  });

  // 保存交易 (同步到全局 expenses/incomes)
  saveTransactionBtn.addEventListener("click", () => {
    const dateInput = document.getElementById("transaction-date");
    const typeSelect = document.getElementById("transaction-type");
    const descInput = document.getElementById("transaction-desc");
    const categorySelect = document.getElementById("transaction-category");
    const accountSelect = document.getElementById("transaction-account");
    const amountInput = document.getElementById("transaction-amount");

    const date = dateInput.value;
    const type = typeSelect.value;
    const description = descInput.value.trim();
    const category = categorySelect.value;
    const account = accountSelect.value;
    const amount = parseFloat(amountInput.value);

    if (!date || !description || isNaN(amount) || amount <= 0) {
      alert("Please fill in all required fields");
      return;
    }

    // 同步到全局
    if (type === "income") {
      globalData.incomes.push({ source: description, amount });
    } else {
      globalData.expenses.push({ category, amount });
    }
    saveData();

    // 创建交易行
    const transactionRow = document.createElement("tr");
    const amountClass = type === "income" ? "income" : "expense";
    const amountSign = type === "income" ? "+" : "-";

    transactionRow.innerHTML = `
            <td>${date}</td>
            <td>${description}</td>
            <td>${category}</td>
            <td>${account}</td>
            <td class="amount ${amountClass}">${amountSign} $${amount.toFixed(
      2
    )}</td>
            <td>
                <button class="btn small-btn edit-transaction"><i class="fas fa-edit"></i></button>
                <button class="btn small-btn delete-transaction"><i class="fas fa-trash"></i></button>
            </td>
        `;

    // 添加到表格
    actualTransactionsList.appendChild(transactionRow);

    // 删除交易
    transactionRow
      .querySelector(".delete-transaction")
      .addEventListener("click", () => {
        transactionRow.remove();
        // 从全局移除 (简化: 基于描述匹配)
        if (type === "income") {
          globalData.incomes = globalData.incomes.filter(
            (i) => i.source !== description
          );
        } else {
          globalData.expenses = globalData.expenses.filter(
            (e) => e.category !== category
          );
        }
        saveData();
      });

    // 清空表单并关闭
    dateInput.value = "";
    descInput.value = "";
    amountInput.value = "";
    transactionForm.classList.add("hidden");
  });

  // 5. 储蓄目标页面逻辑 (修复 Edit/Delete)
  const addGoalBtn = document.getElementById("add-goal-btn");
  const goalForm = document.querySelector(".goal-form");
  const closeGoalForm = goalForm.querySelector(".close-form");
  const saveGoalBtn = goalForm.querySelector(".save-goal");
  const goalsGrid = document.querySelector(".goals-grid");
  let editingGoalIndex = -1;

  // 打开目标表单
  addGoalBtn.addEventListener("click", () => {
    editingGoalIndex = -1;
    goalForm.classList.remove("hidden");
    // 清空表单
    document.getElementById("goal-name").value = "";
    document.getElementById("goal-target").value = "";
    document.getElementById("goal-current").value = "";
    document.getElementById("goal-deadline").value = "";
  });

  // 关闭目标表单
  closeGoalForm.addEventListener("click", () => {
    goalForm.classList.add("hidden");
  });

  // 保存目标
  saveGoalBtn.addEventListener("click", () => {
    const nameInput = document.getElementById("goal-name");
    const targetInput = document.getElementById("goal-target");
    const currentInput = document.getElementById("goal-current");
    const deadlineInput = document.getElementById("goal-deadline");

    const name = nameInput.value.trim();
    const target = parseFloat(targetInput.value);
    const current = parseFloat(currentInput.value);
    const deadline = deadlineInput.value;

    if (
      !name ||
      isNaN(target) ||
      target <= 0 ||
      isNaN(current) ||
      current < 0
    ) {
      alert("Please fill in all required fields correctly");
      return;
    }

    const goal = { name, target, current, deadline };

    if (editingGoalIndex >= 0) {
      globalData.goals[editingGoalIndex] = goal;
    } else {
      globalData.goals.push(goal);
    }

    renderGoals();
    saveData();

    // 清空表单并关闭
    nameInput.value = "";
    targetInput.value = "";
    currentInput.value = "";
    deadlineInput.value = "";
    goalForm.classList.add("hidden");
  });

  // 渲染目标 (用于 Savings 和 Dashboard)
  function renderGoals() {
    // Savings 页面
    goalsGrid.innerHTML = "";
    globalData.goals.forEach((goal, index) => {
      const progress = Math.min(
        Math.round((goal.current / goal.target) * 100),
        100
      );
      const goalCard = document.createElement("div");
      goalCard.className = "goal-card";
      goalCard.innerHTML = `
                <div class="progress-circle" style="--progress:${progress}%">${progress}%</div>
                <div class="goal-details">
                    <h3>${goal.name}</h3>
                    <p class="target">Target: $${goal.target.toFixed(2)}</p>
                    <p class="saved">Saved: $${goal.current.toFixed(2)}</p>
                    ${
                      goal.deadline
                        ? `<p class="deadline">Deadline: ${goal.deadline}</p>`
                        : ""
                    }
                    <div class="progress-bar">
                        <div class="progress-fill" style="width:${progress}%"></div>
                    </div>
                    <div class="goal-actions">
                        <button class="btn small-btn edit-goal"><i class="fas fa-edit"></i> Edit</button>
                        <button class="btn small-btn delete-goal"><i class="fas fa-trash"></i> Delete</button>
                    </div>
                </div>
            `;

      // Edit
      goalCard.querySelector(".edit-goal").addEventListener("click", () => {
        editingGoalIndex = index;
        document.getElementById("goal-name").value = goal.name;
        document.getElementById("goal-target").value = goal.target;
        document.getElementById("goal-current").value = goal.current;
        document.getElementById("goal-deadline").value = goal.deadline;
        goalForm.classList.remove("hidden");
      });

      // Delete
      goalCard.querySelector(".delete-goal").addEventListener("click", () => {
        globalData.goals.splice(index, 1);
        renderGoals();
        saveData();
      });

      goalsGrid.appendChild(goalCard);
    });

    // Dashboard 同步 (简化: 显示 item 列表)
    const dashboardGoals = document.getElementById("dashboard-goals-list");
    dashboardGoals.innerHTML = "";
    globalData.goals.forEach((goal) => {
      const progress = Math.min(
        Math.round((goal.current / goal.target) * 100),
        100
      );
      const goalItem = document.createElement("div");
      goalItem.className = "goal-item";
      goalItem.innerHTML = `
                <div class="progress-circle" style="--progress:${progress}%">${progress}%</div>
                <div class="goal-info">
                    <h4>${goal.name}</h4>
                    <p>Saved up: $${goal.current.toFixed(2)}</p>
                    <p>Goal: $${goal.target.toFixed(2)}</p>
                </div>
            `;
      dashboardGoals.appendChild(goalItem);
    });
  }

  // 6. 购物清单页面逻辑 (优化: 图片放大, 创建文件夹+拖拽)
  const addProductBtn = document.getElementById("add-product-btn");
  const createFolderBtn = document.getElementById("create-folder-btn");
  const productForm = document.querySelector(".product-form");
  const closeProductForm = productForm.querySelector(".close-form");
  const saveProductBtn = productForm.querySelector(".save-product");
  const productPhotoInput = document.getElementById("product-photo");
  const photoPreview = document.getElementById("photo-preview");
  const shoppingGrid = document.querySelector(".shopping-grid");
  const imageModal = document.getElementById("imageModal");
  const modalImage = document.getElementById("modalImage");
  const closeModal = document.querySelector(".close-modal");

  // 图片预览
  productPhotoInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        photoPreview.innerHTML = `<img src="${e.target.result}" alt="Product preview">`;
      };
      reader.readAsDataURL(file);
    } else {
      photoPreview.innerHTML = "";
    }
  });

  // 打开商品表单
  addProductBtn.addEventListener("click", () => {
    productForm.classList.remove("hidden");
  });

  // 关闭商品表单
  closeProductForm.addEventListener("click", () => {
    productForm.classList.add("hidden");
  });

  // 保存商品
  saveProductBtn.addEventListener("click", () => {
    const nameInput = document.getElementById("product-name");
    const categoryInput = document.getElementById("product-category");
    const priceInput = document.getElementById("product-price");
    const qtyInput = document.getElementById("product-qty");

    const name = nameInput.value.trim();
    const category = categoryInput.value.trim();
    const price = parseFloat(priceInput.value);
    const qty = parseInt(qtyInput.value);
    const photoFile = productPhotoInput.files[0];

    if (
      !name ||
      !category ||
      isNaN(price) ||
      price <= 0 ||
      isNaN(qty) ||
      qty < 1
    ) {
      alert("Please fill in all required fields correctly");
      return;
    }

    let photoUrl = "";
    if (photoFile) {
      photoUrl = URL.createObjectURL(photoFile);
    }

    globalData.products.push({
      name,
      category,
      price,
      qty,
      photoUrl,
      folderId: null,
    }); // null 表示未分组
    renderShopping();
    saveData();

    // 清空表单并关闭
    nameInput.value = "";
    categoryInput.value = "";
    priceInput.value = "";
    qtyInput.value = "1";
    productPhotoInput.value = "";
    photoPreview.innerHTML = "";
    productForm.classList.add("hidden");
  });

  // 创建文件夹
  createFolderBtn.addEventListener("click", () => {
    const folderName = prompt("Enter folder name:");
    if (folderName) {
      globalData.folders.push({
        id: Date.now(),
        name: folderName,
        products: [],
      });
      renderShopping();
      saveData();
    }
  });

  // 渲染购物列表 (支持文件夹和拖拽)
  function renderShopping() {
    shoppingGrid.innerHTML = "";

    // 渲染文件夹
    globalData.folders.forEach((folder) => {
      const folderCard = document.createElement("div");
      folderCard.className = "folder-card";
      folderCard.dataset.folderId = folder.id;
      folderCard.innerHTML = `
                <h3>${folder.name}</h3>
                <div class="folder-content"></div>
            `;

      // 拖拽目标事件
      folderCard.addEventListener("dragover", (e) => {
        e.preventDefault();
        folderCard.classList.add("over");
      });
      folderCard.addEventListener("dragleave", () => {
        folderCard.classList.remove("over");
      });
      folderCard.addEventListener("drop", (e) => {
        e.preventDefault();
        folderCard.classList.remove("over");
        const productId = e.dataTransfer.getData("text/plain");
        const product = globalData.products.find((p) => p.name === productId); // 使用 name 作为 id (简化)
        if (product) {
          product.folderId = folder.id;
          renderShopping();
          saveData();
        }
      });

      const folderContent = folderCard.querySelector(".folder-content");
      globalData.products
        .filter((p) => p.folderId === folder.id)
        .forEach((product) => {
          folderContent.appendChild(createProductCard(product));
        });

      shoppingGrid.appendChild(folderCard);
    });

    // 渲染未分组产品
    globalData.products
      .filter((p) => !p.folderId)
      .forEach((product) => {
        shoppingGrid.appendChild(createProductCard(product));
      });
  }

  // 创建产品卡片 (支持拖拽和图片放大)
  function createProductCard(product) {
    const productCard = document.createElement("div");
    productCard.className = "product-card";
    productCard.draggable = true;
    productCard.dataset.productId = product.name; // 使用 name 作为 id

    let photoHtml =
      '<div class="product-image"><i class="fas fa-image" style="font-size: 3rem; color: #ccc;"></i></div>';
    if (product.photoUrl) {
      photoHtml = `<img src="${product.photoUrl}" alt="${product.name}" class="product-image" data-src="${product.photoUrl}">`;
    }

    productCard.innerHTML = `
            ${photoHtml}
            <div class="product-details">
                <h3 class="product-name">${product.name}</h3>
                <p class="product-category">${product.category}</p>
                <p class="product-price">$${product.price.toFixed(2)} x ${
      product.qty
    } = $${(product.price * product.qty).toFixed(2)}</p>
                <div class="goal-actions">
                    <button class="btn small-btn edit-product"><i class="fas fa-edit"></i> Edit</button>
                    <button class="btn small-btn delete-product"><i class="fas fa-trash"></i> Delete</button>
                </div>
            </div>
        `;

    // 拖拽开始
    productCard.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", product.name);
      productCard.classList.add("dragging");
    });
    productCard.addEventListener("dragend", () => {
      productCard.classList.remove("dragging");
    });

    // 图片放大
    const productImage = productCard.querySelector(".product-image");
    if (productImage && product.photoUrl) {
      productImage.addEventListener("click", () => {
        imageModal.style.display = "flex";
        modalImage.src = productImage.getAttribute("data-src");
        modalImage.alt = product.name;
      });
    }

    // 删除商品
    productCard
      .querySelector(".delete-product")
      .addEventListener("click", () => {
        if (product.photoUrl) URL.revokeObjectURL(product.photoUrl);
        globalData.products = globalData.products.filter(
          (p) => p.name !== product.name
        );
        renderShopping();
        saveData();
      });

    // 编辑商品
    productCard.querySelector(".edit-product").addEventListener("click", () => {
      document.getElementById("product-name").value = product.name;
      document.getElementById("product-category").value = product.category;
      document.getElementById("product-price").value = product.price;
      document.getElementById("product-qty").value = product.qty;
      if (product.photoUrl) {
        photoPreview.innerHTML = `<img src="${product.photoUrl}" alt="Product preview">`;
      }
      productForm.classList.remove("hidden");
      // 移除旧的
      globalData.products = globalData.products.filter(
        (p) => p.name !== product.name
      );
    });

    return productCard;
  }

  // 关闭图片弹窗
  closeModal.addEventListener("click", () => {
    imageModal.style.display = "none";
  });

  window.addEventListener("click", (e) => {
    if (e.target === imageModal) {
      imageModal.style.display = "none";
    }
  });

  // Dashboard 信用卡编辑
  const editCreditBtn = document.querySelector(".edit-credit-card");
  const creditForm = document.getElementById("credit-form");
  const closeCreditForm = creditForm.querySelector(".close-form");
  const saveCreditBtn = creditForm.querySelector(".save-credit");

  editCreditBtn.addEventListener("click", () => {
    // 加载第一张卡数据
    if (globalData.creditCards.length > 0) {
      const card = globalData.creditCards[0];
      document.getElementById("credit-holder").value = card.holder;
      document.getElementById("credit-number").value = card.number.replace(
        /•/g,
        ""
      );
      document.getElementById("credit-expiry").value = card.expiry;
      document.getElementById("credit-balance").value = card.balance;
    }
    creditForm.classList.remove("hidden");
  });

  closeCreditForm.addEventListener("click", () => {
    creditForm.classList.add("hidden");
  });

  saveCreditBtn.addEventListener("click", () => {
    const holder = document.getElementById("credit-holder").value.trim();
    const number = document.getElementById("credit-number").value.trim();
    const expiry = document.getElementById("credit-expiry").value.trim();
    const balance = parseFloat(document.getElementById("credit-balance").value);

    if (!holder || !number || !expiry || isNaN(balance)) {
      alert("Please fill in all fields correctly");
      return;
    }

    // 掩码卡号
    const maskedNumber = number.replace(/\d(?=\d{4})/g, "•");

    globalData.creditCards[0] = {
      holder,
      number: maskedNumber,
      expiry,
      balance,
    }; // 只支持一张，覆盖
    updateDashboardSummary();
    saveData();
    creditForm.classList.add("hidden");
  });

  // Settings 页面逻辑
  const saveSettingsBtn = document.querySelector(".save-settings");
  const settingsIconInput = document.getElementById("settings-icon");
  const settingsPreview = document.getElementById("settings-preview");

  function loadSettings() {
    document.getElementById("settings-name").value = globalData.user.name;
    if (globalData.user.avatar) {
      settingsPreview.innerHTML = `<img src="${globalData.user.avatar}" alt="Preview">`;
    }
  }

  settingsIconInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        settingsPreview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
      };
      reader.readAsDataURL(file);
    }
  });

  saveSettingsBtn.addEventListener("click", () => {
    const name = document.getElementById("settings-name").value.trim();
    const file = settingsIconInput.files[0];

    if (name) globalData.user.name = name;
    if (file) {
      globalData.user.avatar = URL.createObjectURL(file);
    }
    saveData();
  });

  // 初始化
  loadData();
  updateBudgetSummary();
  renderGoals();
  renderShopping();
});
