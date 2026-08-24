import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

const DOCUMENTS_KEY = "hexa-documents-v2";

const STARTER_DOCUMENT = {
  id: "welcome-document",
  title: "Welcome to HEXA",
  favorite: false,
  trashed: false,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  html: `
    <h1>Welcome to HEXA</h1>
    <p>HEXA is your intelligent document and knowledge workspace.</p>
    <p>Start writing here. Create beautiful documents, organize your ideas, and work with HEXA AI.</p>
    <h2>Getting Started</h2>
    <p>Select text and use the toolbar to format your document.</p>
  `,
};

const TEMPLATES = [
  {
    id: "report",
    title: "Project Report",
    description: "Professional project report structure.",
    html: `
      <h1>Project Report</h1>
      <p><strong>Prepared by:</strong> Your Name</p>
      <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
      <h2>Executive Summary</h2>
      <p>Provide a concise summary of the project, its objectives and major outcomes.</p>
      <h2>Introduction</h2>
      <p>Introduce the project and explain the context surrounding the work.</p>
      <h2>Objectives</h2>
      <ul>
        <li>Objective one</li>
        <li>Objective two</li>
        <li>Objective three</li>
      </ul>
      <h2>Methodology</h2>
      <p>Describe the methods, resources and procedures used.</p>
      <h2>Findings</h2>
      <p>Present the major findings and observations.</p>
      <h2>Conclusion</h2>
      <p>Summarize the key results and recommendations.</p>
    `,
  },
  {
    id: "letter",
    title: "Official Letter",
    description: "Clean professional correspondence.",
    html: `
      <p><strong>YOUR ORGANIZATION</strong></p>
      <p>Address Line<br/>City, Country</p>
      <p>${new Date().toLocaleDateString()}</p>
      <p><strong>Dear Sir/Madam,</strong></p>
      <h2>Subject: Official Correspondence</h2>
      <p>Write the purpose of this letter here.</p>
      <p>We respectfully write to bring the following matter to your attention.</p>
      <p>We would appreciate your consideration and response.</p>
      <p>Yours faithfully,<br/><strong>Your Name</strong></p>
    `,
  },
  {
    id: "proposal",
    title: "Business Proposal",
    description: "Structured proposal for organizations and clients.",
    html: `
      <h1>Business Proposal</h1>
      <h2>1. Introduction</h2>
      <p>Introduce the proposal and the organization behind it.</p>
      <h2>2. Problem Statement</h2>
      <p>Describe the problem or opportunity being addressed.</p>
      <h2>3. Proposed Solution</h2>
      <p>Explain the proposed solution and why it is valuable.</p>
      <h2>4. Implementation</h2>
      <p>Describe the implementation plan, timeline and resources.</p>
      <h2>5. Budget</h2>
      <table>
        <tbody>
          <tr><th>Item</th><th>Description</th><th>Cost</th></tr>
          <tr><td>Item 1</td><td>Description</td><td>₦0</td></tr>
          <tr><td>Item 2</td><td>Description</td><td>₦0</td></tr>
        </tbody>
      </table>
      <h2>6. Conclusion</h2>
      <p>Summarize the proposal and proposed next steps.</p>
    `,
  },
  {
    id: "memo",
    title: "Internal Memo",
    description: "Fast internal business communication.",
    html: `
      <h1>MEMORANDUM</h1>
      <p><strong>To:</strong> Team</p>
      <p><strong>From:</strong> Your Name</p>
      <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
      <p><strong>Subject:</strong> Important Update</p>
      <h2>Purpose</h2>
      <p>Explain the purpose of this memorandum.</p>
      <h2>Details</h2>
      <p>Provide the relevant information and instructions.</p>
      <h2>Action Required</h2>
      <p>Describe the actions recipients should take.</p>
    `,
  },
];

export default function DocumentEditor() {
  const editorRef = useRef(null);
  const fileRef = useRef(null);

  const [documents, setDocuments] = useState([]);
  const [activeDocumentId, setActiveDocumentId] = useState(null);
  const [title, setTitle] = useState("My Document");
  const [saved, setSaved] = useState(true);
  const [zoom, setZoom] = useState(100);
  const [fontSize, setFontSize] = useState(16);
  const [font, setFont] = useState("Arial");
  const [activeTab, setActiveTab] = useState("Home");
  const [showAI, setShowAI] = useState(true);
  const [showOutline, setShowOutline] = useState(true);
  const [sidebarView, setSidebarView] = useState("home");
  const [wordCount, setWordCount] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [aiInput, setAiInput] = useState("");
  const [search, setSearch] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "ai",
      text: "Hi! I'm HEXA AI. Select text or ask me something about your document.",
    },
  ]);

  useEffect(() => {
    loadDocuments();
  }, []);

  useEffect(() => {
    if (!activeDocumentId || !editorRef.current) return;

    const documentData = documents.find(
      (item) => item.id === activeDocumentId
    );

    if (!documentData) return;

    setTitle(documentData.title);
    editorRef.current.innerHTML = documentData.html || "<p></p>";

    setTimeout(() => {
      updateStats();
    }, 0);
  }, [activeDocumentId]);

  useEffect(() => {
    if (saved) return undefined;

    const timer = setTimeout(() => {
      saveDocument();
    }, 1200);

    return () => clearTimeout(timer);
  }, [saved, title]);

  function loadDocuments() {
    try {
      const stored = localStorage.getItem(DOCUMENTS_KEY);

      if (stored) {
        const parsed = JSON.parse(stored);

        if (Array.isArray(parsed) && parsed.length) {
          setDocuments(parsed);

          const first =
            parsed.find((item) => !item.trashed) || parsed[0];

          setActiveDocumentId(first.id);
          return;
        }
      }

      const initial = {
        ...STARTER_DOCUMENT,
        id: createId(),
      };

      setDocuments([initial]);
      setActiveDocumentId(initial.id);
      localStorage.setItem(
        DOCUMENTS_KEY,
        JSON.stringify([initial])
      );
    } catch (error) {
      console.error("HEXA document loading failed:", error);
    }
  }

  function persistDocuments(nextDocuments) {
    setDocuments(nextDocuments);
    localStorage.setItem(
      DOCUMENTS_KEY,
      JSON.stringify(nextDocuments)
    );
  }

  function createId() {
    return `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 9)}`;
  }

  function updateStats() {
    if (!editorRef.current) return;

    const text = editorRef.current.innerText || "";

    const words = text
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    setWordCount(text.trim() ? words.length : 0);

    const html = editorRef.current.innerHTML || "";

    const breaks =
      (html.match(/hexa-page-break/g) || []).length;

    const contentLength = text.trim().length;

    setPageCount(
      Math.max(
        1,
        breaks + Math.ceil(contentLength / 3200)
      )
    );
  }

  function markChanged() {
    setSaved(false);
    updateStats();
  }

  function saveDocument() {
    if (!editorRef.current || !activeDocumentId) return;

    const nextDocuments = documents.map((item) => {
      if (item.id !== activeDocumentId) return item;

      return {
        ...item,
        title: title.trim() || "Untitled Document",
        html: editorRef.current.innerHTML,
        updatedAt: Date.now(),
      };
    });

    persistDocuments(nextDocuments);
    setSaved(true);
    updateStats();
  }

  function createNewDocument(template = null) {
    const html =
      template?.html ||
      `
        <h1>Untitled Document</h1>
        <p>Start writing your document here...</p>
      `;

    const newDocument = {
      id: createId(),
      title: template?.title || "Untitled Document",
      favorite: false,
      trashed: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      html,
    };

    const nextDocuments = [
      newDocument,
      ...documents,
    ];

    persistDocuments(nextDocuments);
    setActiveDocumentId(newDocument.id);
    setSidebarView("home");
    setSaved(true);
  }

  function duplicateDocument() {
    const current = documents.find(
      (item) => item.id === activeDocumentId
    );

    if (!current) return;

    const duplicate = {
      ...current,
      id: createId(),
      title: `${current.title} Copy`,
      favorite: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    persistDocuments([duplicate, ...documents]);
    setActiveDocumentId(duplicate.id);
  }

  function openDocument(id) {
    const item = documents.find(
      (documentItem) => documentItem.id === id
    );

    if (!item) return;

    setActiveDocumentId(id);
    setSaved(true);
  }

  function toggleFavorite(id) {
    persistDocuments(
      documents.map((item) =>
        item.id === id
          ? { ...item, favorite: !item.favorite }
          : item
      )
    );
  }

  function moveToTrash(id) {
    const next = documents.map((item) =>
      item.id === id
        ? {
            ...item,
            trashed: true,
            updatedAt: Date.now(),
          }
        : item
    );

    persistDocuments(next);

    if (id === activeDocumentId) {
      const replacement = next.find(
        (item) => !item.trashed
      );

      setActiveDocumentId(
        replacement?.id || null
      );
    }
  }

  function restoreDocument(id) {
    persistDocuments(
      documents.map((item) =>
        item.id === id
          ? {
              ...item,
              trashed: false,
              updatedAt: Date.now(),
            }
          : item
      )
    );
  }

  function permanentlyDelete(id) {
    if (
      !window.confirm(
        "Permanently delete this document?"
      )
    ) {
      return;
    }

    const next = documents.filter(
      (item) => item.id !== id
    );

    persistDocuments(next);

    if (id === activeDocumentId) {
      setActiveDocumentId(
        next.find((item) => !item.trashed)?.id ||
          null
      );
    }
  }

  function runCommand(command, value = null) {
    if (!editorRef.current) return;

    editorRef.current.focus();

    document.execCommand(
      command,
      false,
      value
    );

    markChanged();
  }

  function changeFont(value) {
    setFont(value);
    runCommand("fontName", value);
  }

  function changeFontSize(value) {
    const size = Number(value);

    setFontSize(size);

    if (!editorRef.current) return;

    editorRef.current.focus();

    document.execCommand(
      "fontSize",
      false,
      "7"
    );

    const elements =
      editorRef.current.querySelectorAll(
        'font[size="7"]'
      );

    elements.forEach((element) => {
      element.removeAttribute("size");
      element.style.fontSize = `${size}px`;
    });

    markChanged();
  }

  function insertTable() {
    runCommand(
      "insertHTML",
      `
        <table class="hexa-table">
          <tbody>
            <tr>
              <th>Header</th>
              <th>Header</th>
              <th>Header</th>
            </tr>
            <tr>
              <td>Content</td>
              <td>Content</td>
              <td>Content</td>
            </tr>
            <tr>
              <td>Content</td>
              <td>Content</td>
              <td>Content</td>
            </tr>
          </tbody>
        </table>
        <p></p>
      `
    );
  }

  function insertImage() {
    const url = window.prompt(
      "Enter image URL:"
    );

    if (!url) return;

    runCommand(
      "insertHTML",
      `<img src="${escapeAttribute(
        url
      )}" alt="Document image" />`
    );
  }

  function insertLink() {
    const url = window.prompt(
      "Enter website URL:"
    );

    if (!url) return;

    runCommand("createLink", url);
  }

  function insertPageBreak() {
    runCommand(
      "insertHTML",
      `<div class="hexa-page-break"></div><p></p>`
    );
  }

  function insertHorizontalLine() {
    runCommand(
      "insertHTML",
      `<hr /><p></p>`
    );
  }

  function printDocument() {
    window.print();
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }

  function openFilePicker() {
    fileRef.current?.click();
  }

  async function importFile(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    try {
      const extension =
        file.name
          .split(".")
          .pop()
          ?.toLowerCase() || "";

      const cleanTitle =
        file.name.replace(/\.[^/.]+$/, "");

      if (extension === "txt") {
        const text = await file.text();

        const html = `<p>${escapeHTML(
          text
        ).replace(/\n/g, "<br />")}</p>`;

        replaceCurrentDocument(
          cleanTitle,
          html
        );
      } else if (
        extension === "html" ||
        extension === "htm"
      ) {
        const html = await file.text();

        replaceCurrentDocument(
          cleanTitle,
          html
        );
      } else if (extension === "docx") {
        try {
          const mammoth = await import("mammoth");

          const buffer =
            await file.arrayBuffer();

          const result =
            await mammoth.convertToHtml({
              arrayBuffer: buffer,
            });

          replaceCurrentDocument(
            cleanTitle,
            result.value
          );
        } catch (error) {
          console.error(error);

          window.alert(
            "DOCX import requires Mammoth.\n\nRun:\nnpm.cmd install mammoth"
          );
        }
      } else {
        window.alert(
          "HEXA supports DOCX, TXT and HTML."
        );
      }
    } catch (error) {
      console.error(
        "HEXA import failed:",
        error
      );

      window.alert(
        "HEXA could not open this file."
      );
    } finally {
      event.target.value = "";
    }
  }

  function replaceCurrentDocument(
    newTitle,
    html
  ) {
    if (!activeDocumentId) {
      createNewDocument({
        title: newTitle,
        html,
      });

      return;
    }

    setTitle(newTitle);

    if (editorRef.current) {
      editorRef.current.innerHTML =
        html || "<p></p>";
    }

    setSaved(false);
    updateStats();
  }

  function exportHTML() {
    if (!editorRef.current) return;

    const html = createExportHTML();

    download(
      html,
      `${safeName(title)}.html`,
      "text/html"
    );
  }

  function exportWord() {
    if (!editorRef.current) return;

    const html = createExportHTML();

    download(
      html,
      `${safeName(title)}.doc`,
      "application/msword"
    );
  }

  function createExportHTML() {
    return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${escapeHTML(title)}</title>
<style>
@page {
  size: A4;
  margin: 2cm;
}

body {
  font-family: Arial, sans-serif;
  font-size: 11pt;
  line-height: 1.6;
  color: #172033;
}

h1 {
  font-size: 24pt;
}

h2 {
  font-size: 16pt;
}

img {
  max-width: 100%;
}

table {
  width: 100%;
  border-collapse: collapse;
}

td,
th {
  border: 1px solid #888;
  padding: 8px;
}
</style>
</head>
<body>
${editorRef.current.innerHTML}
</body>
</html>
`;
  }

  function sendAI() {
    const question = aiInput.trim();

    if (!question) return;

    const response = localAI(
      question,
      wordCount
    );

    setMessages((current) => [
      ...current,
      {
        role: "user",
        text: question,
      },
      {
        role: "ai",
        text: response,
      },
    ]);

    setAiInput("");
  }

  function rewriteSelection() {
    const selection =
      window.getSelection()?.toString().trim();

    if (!selection) {
      setAiInput(
        "Rewrite the selected text professionally."
      );
      return;
    }

    setMessages((current) => [
      ...current,
      {
        role: "user",
        text: `Rewrite: "${selection}"`,
      },
      {
        role: "ai",
        text:
          "I found the selected text. HEXA AI is ready to rewrite it once your AI backend is connected.",
      },
    ]);
  }

  function summarize() {
    setMessages((current) => [
      ...current,
      {
        role: "user",
        text: "Summarize my document.",
      },
      {
        role: "ai",
        text: `Your document currently contains approximately ${wordCount} words across ${pageCount} page${pageCount === 1 ? "" : "s"}. Connect the HEXA AI backend for a full intelligent summary.`,
      },
    ]);
  }

  function checkWriting() {
    setAiInput(
      "Check my document for grammar, spelling and clarity."
    );
  }

  function continueWriting() {
    setAiInput(
      "Continue writing my document based on the current content."
    );
  }

  function handleEditorKey(event) {
    const modifier =
      event.ctrlKey || event.metaKey;

    if (!modifier) return;

    const key = event.key.toLowerCase();

    if (key === "s") {
      event.preventDefault();
      saveDocument();
    }

    if (key === "b") {
      event.preventDefault();
      runCommand("bold");
    }

    if (key === "i") {
      event.preventDefault();
      runCommand("italic");
    }

    if (key === "u") {
      event.preventDefault();
      runCommand("underline");
    }
  }

  const visibleDocuments = useMemo(() => {
    let result = documents;

    if (sidebarView === "recent") {
      result = result
        .filter((item) => !item.trashed)
        .sort(
          (a, b) =>
            b.updatedAt - a.updatedAt
        );
    } else if (sidebarView === "favorites") {
      result = result.filter(
        (item) =>
          item.favorite && !item.trashed
      );
    } else if (sidebarView === "trash") {
      result = result.filter(
        (item) => item.trashed
      );
    } else {
      result = result.filter(
        (item) => !item.trashed
      );
    }

    if (search.trim()) {
      const q = search.toLowerCase();

      result = result.filter((item) =>
        item.title
          .toLowerCase()
          .includes(q)
      );
    }

    return result;
  }, [documents, sidebarView, search]);

  const currentDocument = documents.find(
    (item) => item.id === activeDocumentId
  );

  return (
    <div className="hexa-app">

      {/* HEADER */}

      <header className="hexa-header">

        <div className="header-left">

          <button
            className="hexa-mark"
            onClick={() =>
              setSidebarView("home")
            }
            title="HEXA Workspace"
          >
            H
          </button>

          <div className="hexa-brand">
            <strong>HEXA</strong>
            <span>WORKSPACE</span>
          </div>

          <div className="header-line" />

          <input
            className="title-input"
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              setSaved(false);
            }}
            aria-label="Document title"
          />

          <span
            className={
              saved
                ? "save-status saved"
                : "save-status"
            }
          >
            <i />
            {saved ? "Saved" : "Unsaved changes"}
          </span>

        </div>

        <div className="header-right">

          <button
            className="icon-button"
            onClick={() =>
              runCommand("undo")
            }
            title="Undo"
          >
            ↶
          </button>

          <button
            className="icon-button"
            onClick={() =>
              runCommand("redo")
            }
            title="Redo"
          >
            ↷
          </button>

          <button
            className={
              showAI
                ? "ai-button active"
                : "ai-button"
            }
            onClick={() =>
              setShowAI((value) => !value)
            }
          >
            ✦ AI
          </button>

          <button
            className="export-button"
            onClick={exportWord}
          >
            Export
            <span>⌄</span>
          </button>

          <button
            className="profile-button"
            onClick={toggleFullscreen}
            title="Fullscreen"
          >
            H
          </button>

        </div>

      </header>

      {/* RIBBON TABS */}

      <nav className="hexa-tabs">

        {[
          "Home",
          "Insert",
          "Layout",
          "Review",
          "View",
        ].map((tab) => (
          <button
            key={tab}
            className={
              activeTab === tab
                ? "tab active"
                : "tab"
            }
            onClick={() =>
              setActiveTab(tab)
            }
          >
            {tab}
          </button>
        ))}

      </nav>

      {/* TOOLBAR */}

      <div className="hexa-toolbar">

        {activeTab === "Home" && (
          <>
            <ToolbarButton
              label="↶"
              title="Undo"
              onClick={() =>
                runCommand("undo")
              }
            />

            <ToolbarButton
              label="↷"
              title="Redo"
              onClick={() =>
                runCommand("redo")
              }
            />

            <ToolbarDivider />

            <select
              className="toolbar-select font-select"
              value={font}
              onChange={(event) =>
                changeFont(
                  event.target.value
                )
              }
            >
              <option>Arial</option>
              <option>Aptos</option>
              <option>Calibri</option>
              <option>Georgia</option>
              <option>Verdana</option>
              <option>
                Times New Roman
              </option>
            </select>

            <select
              className="toolbar-select size-select"
              value={fontSize}
              onChange={(event) =>
                changeFontSize(
                  event.target.value
                )
              }
            >
              {[
                10,
                11,
                12,
                14,
                16,
                18,
                20,
                24,
                28,
                32,
                36,
                48,
              ].map((size) => (
                <option
                  key={size}
                  value={size}
                >
                  {size}
                </option>
              ))}
            </select>

            <ToolbarDivider />

            <ToolbarButton
              label="B"
              title="Bold"
              className="bold"
              onClick={() =>
                runCommand("bold")
              }
            />

            <ToolbarButton
              label="I"
              title="Italic"
              className="italic"
              onClick={() =>
                runCommand("italic")
              }
            />

            <ToolbarButton
              label="U"
              title="Underline"
              className="underline"
              onClick={() =>
                runCommand("underline")
              }
            />

            <ToolbarDivider />

            <ToolbarButton
              label="☰"
              title="Align left"
              onClick={() =>
                runCommand(
                  "justifyLeft"
                )
              }
            />

            <ToolbarButton
              label="≡"
              title="Center"
              onClick={() =>
                runCommand(
                  "justifyCenter"
                )
              }
            />

            <ToolbarButton
              label="☷"
              title="Align right"
              onClick={() =>
                runCommand(
                  "justifyRight"
                )
              }
            />

            <ToolbarDivider />

            <ToolbarButton
              label="•"
              title="Bullet list"
              onClick={() =>
                runCommand(
                  "insertUnorderedList"
                )
              }
            />

            <ToolbarButton
              label="1."
              title="Numbered list"
              onClick={() =>
                runCommand(
                  "insertOrderedList"
                )
              }
            />

            <button
              className="clear-button"
              onClick={() =>
                runCommand(
                  "removeFormat"
                )
              }
            >
              Clear
            </button>
          </>
        )}

        {activeTab === "Insert" && (
          <>
            <ToolbarBig
              icon="▦"
              text="Table"
              onClick={insertTable}
            />

            <ToolbarBig
              icon="▧"
              text="Image"
              onClick={insertImage}
            />

            <ToolbarBig
              icon="🔗"
              text="Link"
              onClick={insertLink}
            />

            <ToolbarBig
              icon="↵"
              text="Page break"
              onClick={insertPageBreak}
            />

            <ToolbarBig
              icon="―"
              text="Divider"
              onClick={insertHorizontalLine}
            />
          </>
        )}

        {activeTab === "Layout" && (
          <>
            <ToolbarBig
              icon="A4"
              text="A4"
              onClick={() =>
                window.alert(
                  "HEXA documents use A4 paper."
                )
              }
            />

            <ToolbarBig
              icon="↔"
              text="Margins"
              onClick={() =>
                window.alert(
                  "Standard A4 margins are active."
                )
              }
            />

            <ToolbarBig
              icon="↕"
              text="Portrait"
              onClick={() =>
                window.alert(
                  "Portrait orientation is active."
                )
              }
            />
          </>
        )}

        {activeTab === "Review" && (
          <>
            <ToolbarBig
              icon="✦"
              text="Rewrite"
              onClick={rewriteSelection}
            />

            <ToolbarBig
              icon="≡"
              text="Summarize"
              onClick={summarize}
            />

            <ToolbarBig
              icon="✓"
              text="Check writing"
              onClick={checkWriting}
            />
          </>
        )}

        {activeTab === "View" && (
          <>
            <ToolbarBig
              icon="☷"
              text="Outline"
              onClick={() =>
                setShowOutline(
                  (value) => !value
                )
              }
            />

            <ToolbarBig
              icon="▣"
              text="Print"
              onClick={printDocument}
            />

            <ToolbarBig
              icon="⛶"
              text="Fullscreen"
              onClick={toggleFullscreen}
            />

            <ToolbarBig
              icon="100%"
              text="Reset zoom"
              onClick={() =>
                setZoom(100)
              }
            />
          </>
        )}

      </div>

      {/* MAIN WORKSPACE */}

      <main className="hexa-main">

        {/* LEFT */}

        <aside className="hexa-sidebar">

          <button
            className="new-document-button"
            onClick={() =>
              createNewDocument()
            }
          >
            <span>＋</span>
            New document
          </button>

          <SidebarSection title="WORKSPACE">

            <SidebarItem
              icon="⌂"
              text="Home"
              active={
                sidebarView === "home"
              }
              onClick={() =>
                setSidebarView("home")
              }
            />

            <SidebarItem
              icon="◷"
              text="Recent"
              active={
                sidebarView === "recent"
              }
              onClick={() =>
                setSidebarView("recent")
              }
            />

            <SidebarItem
              icon="★"
              text="Favorites"
              active={
                sidebarView === "favorites"
              }
              onClick={() =>
                setSidebarView("favorites")
              }
            />

            <SidebarItem
              icon="▣"
              text="My Documents"
              active={
                sidebarView === "home"
              }
              onClick={() =>
                setSidebarView("home")
              }
            />

          </SidebarSection>

          <SidebarSection title="ORGANIZE">

            <SidebarItem
              icon="▱"
              text="Folders"
              onClick={() =>
                window.alert(
                  "Folders are coming next in HEXA Workspace."
                )
              }
            />

            <SidebarItem
              icon="▦"
              text="Templates"
              onClick={() =>
                setSidebarView("templates")
              }
            />

            <SidebarItem
              icon="⌫"
              text="Trash"
              active={
                sidebarView === "trash"
              }
              onClick={() =>
                setSidebarView("trash")
              }
            />

          </SidebarSection>

          <div className="sidebar-bottom">

            <div className="storage-card">

              <div className="storage-icon">
                ◈
              </div>

              <div>
                <strong>Local workspace</strong>
                <small>
                  Your documents are stored
                  locally.
                </small>
              </div>

            </div>

          </div>

        </aside>

        {/* CENTER */}

        <section className="editor-area">

          <div className="editor-top">

            <div className="breadcrumbs">

              <span>
                {sidebarView === "trash"
                  ? "Trash"
                  : "My Documents"}
              </span>

              <b>/</b>

              <strong>
                {title}
              </strong>

            </div>

            <div className="editor-actions">

              <button
                onClick={openFilePicker}
              >
                Open
              </button>

              <button
                onClick={duplicateDocument}
              >
                Duplicate
              </button>

              <button
                className="save-editor-button"
                onClick={saveDocument}
              >
                Save
              </button>

            </div>

          </div>

          {sidebarView === "templates" ? (
            <TemplateView
              templates={TEMPLATES}
              onUse={(template) =>
                createNewDocument(
                  template
                )
              }
            />
          ) : (
            <div className="editor-workspace">

              {showOutline && (
                <aside className="document-outline">

                  <span>DOCUMENT</span>

                  <button className="outline-active">
                    {title}
                  </button>

                  <button>
                    Introduction
                  </button>

                  <button>
                    Main content
                  </button>

                  <button>
                    Conclusion
                  </button>

                  <div className="outline-tip">
                    <span>✦</span>
                    <div>
                      <strong>
                        HEXA AI
                      </strong>
                      <small>
                        Select text to work
                        with AI.
                      </small>
                    </div>
                  </div>

                </aside>
              )}

              <div className="editor-scroll">

                <div
                  className="paper-container"
                  style={{
                    transform: `scale(${zoom / 100})`,
                  }}
                >

                  <article className="paper">

                    <div className="paper-header-line">
                      <span>HEXA WORKSPACE</span>
                      <span>
                        {new Date().getFullYear()}
                      </span>
                    </div>

                    <div
                      ref={editorRef}
                      className="document-editor"
                      contentEditable
                      suppressContentEditableWarning
                      spellCheck
                      onInput={markChanged}
                      onKeyDown={
                        handleEditorKey
                      }
                    />

                  </article>

                </div>

              </div>

            </div>
          )}

        </section>

        {/* RIGHT AI */}

        {showAI && (
          <aside className="hexa-ai">

            <div className="ai-header">

              <div className="ai-brand">

                <div className="ai-logo">
                  ✦
                </div>

                <div>
                  <strong>
                    HEXA AI
                  </strong>

                  <small>
                    Document intelligence
                  </small>
                </div>

              </div>

              <button
                className="ai-close"
                onClick={() =>
                  setShowAI(false)
                }
              >
                ×
              </button>

            </div>

            <div className="ai-content">

              <div className="ai-welcome">

                <div className="welcome-icon">
                  H
                </div>

                <strong>
                  Your document assistant
                </strong>

                <p>
                  Improve, understand and
                  create content without
                  leaving your workspace.
                </p>

              </div>

              <div className="ai-shortcuts">

                <AIAction
                  icon="✦"
                  title="Rewrite"
                  description="Improve selected text"
                  onClick={
                    rewriteSelection
                  }
                />

                <AIAction
                  icon="≡"
                  title="Summarize"
                  description="Find the key ideas"
                  onClick={summarize}
                />

                <AIAction
                  icon="→"
                  title="Continue writing"
                  description="Generate the next section"
                  onClick={
                    continueWriting
                  }
                />

                <AIAction
                  icon="✓"
                  title="Check writing"
                  description="Grammar and clarity"
                  onClick={checkWriting}
                />

              </div>

              <div className="ai-divider">
                CONVERSATION
              </div>

              <div className="ai-messages">

                {messages.map(
                  (message, index) => (
                    <div
                      key={`${message.role}-${index}`}
                      className={
                        message.role ===
                        "user"
                          ? "ai-message user-message"
                          : "ai-message"
                      }
                    >
                      {message.text}
                    </div>
                  )
                )}

              </div>

            </div>

            <div className="ai-input-area">

              <textarea
                value={aiInput}
                onChange={(event) =>
                  setAiInput(
                    event.target.value
                  )
                }
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    !event.shiftKey
                  ) {
                    event.preventDefault();
                    sendAI();
                  }
                }}
                placeholder="Ask HEXA anything..."
              />

              <button
                onClick={sendAI}
                title="Send"
              >
                ↑
              </button>

            </div>

          </aside>
        )}

      </main>

      {/* STATUS BAR */}

      <footer className="hexa-status">

        <span>
          Page {pageCount} of {pageCount}
        </span>

        <span>
          {wordCount} words
        </span>

        <span>
          English
        </span>

        <div className="status-space" />

        <button
          onClick={() =>
            setZoom(
              Math.max(60, zoom - 10)
            )
          }
        >
          −
        </button>

        <span>{zoom}%</span>

        <input
          type="range"
          min="60"
          max="150"
          value={zoom}
          onChange={(event) =>
            setZoom(
              Number(event.target.value)
            )
          }
        />

        <button
          onClick={() =>
            setZoom(
              Math.min(150, zoom + 10)
            )
          }
        >
          +
        </button>

      </footer>

      <input
        ref={fileRef}
        type="file"
        hidden
        accept=".docx,.txt,.html,.htm"
        onChange={importFile}
      />

    </div>
  );
}

function ToolbarButton({
  label,
  title,
  onClick,
  className = "",
}) {
  return (
    <button
      className={`toolbar-button ${className}`}
      title={title}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function ToolbarDivider() {
  return (
    <div className="toolbar-divider" />
  );
}

function ToolbarBig({
  icon,
  text,
  onClick,
}) {
  return (
    <button
      className="toolbar-big"
      onClick={onClick}
      type="button"
    >
      <strong>{icon}</strong>
      <span>{text}</span>
    </button>
  );
}

function SidebarSection({
  title,
  children,
}) {
  return (
    <div className="sidebar-section">
      <span className="sidebar-label">
        {title}
      </span>
      {children}
    </div>
  );
}

function SidebarItem({
  icon,
  text,
  active = false,
  onClick,
}) {
  return (
    <button
      type="button"
      className={
        active
          ? "sidebar-item active"
          : "sidebar-item"
      }
      onClick={onClick}
    >
      <span className="sidebar-item-icon">
        {icon}
      </span>
      {text}
    </button>
  );
}

function AIAction({
  icon,
  title,
  description,
  onClick,
}) {
  return (
    <button
      className="ai-action"
      onClick={onClick}
    >
      <span>{icon}</span>

      <div>
        <strong>{title}</strong>
        <small>{description}</small>
      </div>

      <b>›</b>
    </button>
  );
}

function TemplateView({
  templates,
  onUse,
}) {
  return (
    <div className="template-workspace">

      <div className="template-workspace-header">
        <div>
          <span>HEXA TEMPLATES</span>
          <h1>Start with a professional document</h1>
          <p>
            Choose a structure and make it
            yours.
          </p>
        </div>
      </div>

      <div className="template-workspace-grid">

        {templates.map((template) => (
          <button
            key={template.id}
            className="workspace-template-card"
            onClick={() =>
              onUse(template)
            }
          >
            <div className="template-preview">
              <div>
                <i />
                <i />
                <i />
                <i />
                <i />
                <i />
              </div>

              <span>
                Use template
              </span>
            </div>

            <strong>
              {template.title}
            </strong>

            <small>
              {template.description}
            </small>
          </button>
        ))}

      </div>

    </div>
  );
}

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function safeName(value) {
  return (
    String(value || "HEXA Document")
      .replace(/[<>:"/\\|?*]+/g, "")
      .trim() || "HEXA Document"
  );
}

function download(
  content,
  filename,
  type
) {
  const blob = new Blob([content], {
    type: `${type};charset=utf-8`,
  });

  const url =
    URL.createObjectURL(blob);

  const link =
    document.createElement("a");

  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

function localAI(question, wordCount) {
  const q =
    question.toLowerCase();

  if (q.includes("summar")) {
    return `HEXA found approximately ${wordCount} words in the current document. Full AI-powered summarization will be handled by your HEXA AI backend.`;
  }

  if (q.includes("rewrite")) {
    return "Select the text you want HEXA AI to rewrite, then use the Rewrite action.";
  }

  if (
    q.includes("grammar") ||
    q.includes("spell")
  ) {
    return "HEXA AI can check grammar, spelling, clarity and professional tone once the AI backend is connected.";
  }

  if (q.includes("continue")) {
    return "HEXA AI can continue the current document while preserving its context once the AI backend is connected.";
  }

  if (
    q.includes("hello") ||
    q.includes("hi")
  ) {
    return "Hello! 👋 I'm HEXA AI. What are we creating today?";
  }

  return `I understand your request:\n\n"${question}"\n\nHEXA AI is ready to work with your document.`;
}