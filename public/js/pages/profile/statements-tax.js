"use strict";

import {
  db,
  doc,
  collection,
  getDoc,
  getDocs,
  query,
  where,
  orderBy
} from "../../api/firebase-client.js";
import { downloadBlob } from "./ui-helpers.js";

// ---------------------------------------------------------------------------
// Database loads
// ---------------------------------------------------------------------------

export async function loadStatements(userData, year) {
  const statementList = document.querySelector(".statement-list");
  if (!statementList) return;

  statementList.innerHTML = "";

  if (!userData) return null;

  try {
    const statementCollectionRef = collection(
      db,
      "userProfiles",
      userData.email,
      "statements"
    );

    const statementsQuery = query(
      statementCollectionRef,
      where("year", "==", year),
      orderBy("month", "asc")
    );

    const statementsSnapshot = await getDocs(statementsQuery);

    if (statementsSnapshot.empty) {
      showNoStatementsModal(statementList);
      return;
    }

    statementsSnapshot.forEach((doc) => {
      const statement = doc.data();

      const statementItem = document.createElement("div");
      statementItem.className = "statement-item";

      const downloadUrl = statement.downloadUrl || "#";

      statementItem.innerHTML = `
      <div class="statement-info">
        <div class="icon-container">
          <i class="far fa-file-alt"></i>
        </div>
        <div class="statement-text">
          <p class="title">${statement.title}</p>
          <p class="subtitle">${statement.year}</p>
        </div>
      </div>
      <a href="${downloadUrl}" class="statement-action">
        <i class="fas fa-download"></i>
        <span>View Details</span>
      </a>
      `;

      statementList.appendChild(statementItem);
    });
  } catch (error) {
    console.log("Error occurred loading data: ", error);
  }
}

export async function loadTaxDocuments(userData, year) {
  const taxFormsContainer = document.querySelector(".tax-forms-container");
  if (!userData || !year || !taxFormsContainer) return null;

  taxFormsContainer.innerHTML = "";

  try {
    const taxDocRef = doc(
      db,
      "userProfiles",
      userData.email,
      "taxDocuments",
      year.toString()
    );

    const taxDocSnapshot = await getDoc(taxDocRef);

    if (!taxDocSnapshot.data()) {
      showNoTaxDocumentsModal(taxFormsContainer);
      return;
    }

    const taxDocData = taxDocSnapshot.data();

    if (taxDocData["1099k"]) {
      const form1099k = taxDocData["1099k"];

      const taxFormItem = document.createElement("div");
      taxFormItem.className = "tax-form-item";

      taxFormItem.innerHTML = `
        <div class="tax-form-info">
            <div class="icon-container">
              <i class="far fa-file-alt"></i>
            </div>
            <div class="tax-form-details">
              <p class="form-title">Form ${taxDocData.formType}</p>
              <p class="form-description">
                ${taxDocData.description}
              </p>
              <p class="form-status">
                Status: ${form1099k.status}
              </p>
              <p class="form-deadline">
                Due Date: ${form1099k.dueDate}
              </p>
            </div>
          </div>
          <a href="${form1099k.downloadUrl}" class="tax-form-download" id="downloadLink">
            <i class="fas fa-download"></i>
            <span>Download</span>
          </a>
      `;

      taxFormsContainer.appendChild(taxFormItem);
    }
  } catch (error) {
    console.error("Error happened when trying to load tax documents: ", error);
  }
}

export async function loadTaxSettings(userData) {
  if (!userData) return null;

  try {
    const userDocRef = doc(db, "userProfiles", userData.email);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.data().taxInformation) {
      const taxInformationData = userDoc.data().taxInformation;
      updateTaxInfoDisplay(taxInformationData);
    } else {
      console.error("Tax Information does not exist");
      return null;
    }
  } catch (error) {
    console.log("Error occurred when loading tax information: ", error);
    return null;
  }
}

export async function loadYearFilters(userData) {
  if (!userData) return;

  try {
    const taxYearsDocRef = collection(
      db,
      "userProfiles",
      userData.email,
      "taxDocuments"
    );

    const yearDocsRef = await getDocs(taxYearsDocRef);

    if (!yearDocsRef.empty) {
      const taxYearList = document.querySelector(".tax-year-list");
      if (!taxYearList) return;

      taxYearList.innerHTML = "";

      const set = new Set();
      yearDocsRef.forEach((doc) => set.add(doc.id));

      const sortedArray = Array.from(set).sort((a, b) => a - b);
      const sortedSet = new Set(sortedArray);

      sortedSet.forEach((year) => {
        const li = document.createElement("li");
        li.dataset.year = year;
        li.textContent = year;

        taxYearList.appendChild(li);
      });

      initializeYearFilter(userData);
    }
  } catch (error) {
    console.log("Error ocurred when trying to load tax years ", error);
  }
}

// ---------------------------------------------------------------------------
// Filtering
// ---------------------------------------------------------------------------

export function initializeYearFilter(userData) {
  const yearOptions = document.querySelectorAll("#yearMenu li");
  const selectedYear = document.getElementById("selectedYear");
  const yearMenu = document.getElementById("yearMenu");

  yearOptions.forEach((option) => {
    option.addEventListener("click", async function () {
      const year = parseInt(this.dataset.year);
      if (selectedYear) selectedYear.textContent = this.dataset.year;
      if (yearMenu) yearMenu.style.display = "none";

      await filterTaxAndStatementByYear(userData, year);
    });
  });
}

export async function filterTaxAndStatementByYear(userData, year) {
  await loadStatements(userData, year);
  await loadTaxDocuments(userData, year);

  const taxYear = document.querySelector(".tax-year-dropdown");
  if (taxYear) taxYear.value = year;
}

// ---------------------------------------------------------------------------
// UI helpers
// ---------------------------------------------------------------------------

function showNoStatementsModal(container) {
  container.innerHTML = `
  <div
                class="no-statement-modal"
                id="no-statement-modal"
                role="dialog"
                aria-labelledby="no-statement-title"
                aria-describedby="no-statement-description"
              >
                <div class="no-statement-modal-content">
                  <div class="no-statement-icon">
                    <i class="far fa-file-alt" aria-hidden="true"></i>
                  </div>
                  <h3 class="no-statement-title">No statements available</h3>
                  <p class="no-statement-description">
                    There are currently no statements for this period.
                    Statements will appear here once they become available.
                  </p>
                </div>
              </div>
  `;
}

function showNoTaxDocumentsModal(container) {
  container.innerHTML = `
  <div
                class="no-statement-modal"
                id="no-statement-modal"
                role="dialog"
                aria-labelledby="no-statement-title"
                aria-describedby="no-statement-description"
              >
                <div class="no-statement-modal-content">
                  <div class="no-statement-icon">
                    <i class="far fa-file-alt" aria-hidden="true"></i>
                  </div>
                  <h3 class="no-statement-title">No tax documents available</h3>
                  <p class="no-statement-description">
                    No tax documents are currently available.
                  </p>
                </div>
              </div>
  `;
}

function updateTaxInfoDisplay(taxData) {
  document.querySelector("#taxId-value").textContent = taxData.taxId;
  document.querySelector("#w9-value").textContent = taxData.taxFormType;
  document.querySelector("#businessType-value").textContent =
    taxData.businessType;
  document.querySelector(
    "#taxWithholding-value"
  ).textContent = `${taxData.taxWithholding}%`;
  document.querySelector("#taxState-value").textContent = taxData.state;
  document.querySelector("#taxLastUpdate-value").textContent =
    taxData.lastUpdate;
}

// ---------------------------------------------------------------------------
// Wiring
// ---------------------------------------------------------------------------

export function initStatementsTax(userData) {
  initFilterAndYearDropdowns(userData);
  initStatementsToggle();
  initTaxInfoForm();
  initTaxHeaderToggle();
  initTaxNavTabs();
  initDownloadLink();
}

function initFilterAndYearDropdowns(userData) {
  const filterBtn = document.getElementById("filterBtn");
  const filterMenu = document.getElementById("filterMenu");
  const yearBtn = document.getElementById("yearBtn");
  const yearMenu = document.getElementById("yearMenu");
  const selectedYear = document.getElementById("selectedYear");
  const currentYear = new Date().getFullYear();

  if (!filterBtn || !filterMenu || !yearBtn || !yearMenu || !selectedYear)
    return;

  selectedYear.textContent = currentYear;

  filterBtn.addEventListener("click", function () {
    filterMenu.style.display =
      filterMenu.style.display === "block" ? "none" : "block";
    yearMenu.style.display = "none";
  });

  yearBtn.addEventListener("click", function () {
    yearMenu.style.display =
      yearMenu.style.display === "block" ? "none" : "block";
    filterMenu.style.display = "none";
  });

  document.addEventListener("click", function (event) {
    if (
      !filterBtn.contains(event.target) &&
      !filterMenu.contains(event.target)
    ) {
      filterMenu.style.display = "none";
    }
    if (!yearBtn.contains(event.target) && !yearMenu.contains(event.target)) {
      yearMenu.style.display = "none";
    }
  });

  initializeYearFilter(userData);
}

function initStatementsToggle() {
  const statementsHeader = document.getElementById("statementHeader");
  const statementsList = document.getElementById("statementList");
  if (!statementsHeader || !statementsList) return;

  statementsHeader.addEventListener("click", function () {
    this.classList.toggle("active");
    statementsList.classList.toggle("active");
  });
}

function initTaxInfoForm() {
  const updateTaxInfoBtn = document.getElementById("updateTaxInfoBtn");
  const toggleButton = document.querySelector(".toggle-visibility");
  const passwordInput = document.getElementById("taxId");
  const taxCancelBtn = document.querySelector(
    "#taxInformationForm .btn-secondary"
  );
  const taxInformationPreview = document.querySelector(
    ".tax-information-preview"
  );
  const taxInformationForm = document.getElementById("tax-form");
  const taxForm = document.getElementById("taxInformationForm");

  if (toggleButton && passwordInput) {
    toggleButton.addEventListener("click", () => {
      if (passwordInput.type === "password") {
        passwordInput.type = "text";
        toggleButton.innerHTML = `<i class="fa-solid fa-eye-slash"></i>`;
      } else {
        passwordInput.type = "password";
        toggleButton.innerHTML = `<i class="fa-solid fa-eye"></i>`;
      }
    });
  }

  if (updateTaxInfoBtn && taxInformationPreview && taxInformationForm) {
    updateTaxInfoBtn.addEventListener("click", () => {
      if (taxInformationPreview.classList.contains("show")) {
        taxInformationPreview.classList.remove("show");
      }
      taxInformationPreview.classList.add("remove");
      taxInformationForm.classList.add("show");
    });
  }

  if (taxForm && taxInformationForm && taxInformationPreview) {
    taxForm.addEventListener("submit", (e) => {
      e.preventDefault();
      // validate form logic here
      taxInformationForm.classList.remove("show");
      taxInformationPreview.classList.add("show");
      // show success message
    });
  }

  if (taxCancelBtn && taxInformationForm && taxInformationPreview) {
    taxCancelBtn.addEventListener("click", () => {
      taxInformationForm.classList.remove("show");
      taxInformationPreview.classList.add("show");
    });
  }
}

function initTaxHeaderToggle() {
  const taxHeader = document.getElementById("taxHeader");
  const taxContent = document.getElementById("taxContent");
  if (!taxHeader || !taxContent) return;

  taxHeader.addEventListener("click", function () {
    this.classList.toggle("active");
    taxContent.classList.toggle("active");
  });
}

function initTaxNavTabs() {
  const taxNavItems = document.querySelectorAll(".tax-nav-item");
  const taxContentSections = document.querySelectorAll(".tax-tab-content");

  taxNavItems.forEach((item) => {
    item.addEventListener("click", () => {
      const dataTab = item.getAttribute("data-tab");
      const targetId = document.getElementById(dataTab);

      taxNavItems.forEach((navItem) => navItem.classList.remove("active"));
      taxContentSections.forEach((section) => {
        section.classList.remove("active");
      });

      item.classList.add("active");
      targetId.classList.add("active");
    });
  });
}

function initDownloadLink() {
  const downloadLink = document.getElementById("downloadLink");
  if (!downloadLink) return;

  downloadLink.addEventListener("click", function (event) {
    event.preventDefault();
    downloadBlob();
  });
}
