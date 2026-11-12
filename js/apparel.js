
      const config = window.QRGuysConfig;
      const SUPABASE_URL = config.supabaseUrl;
      const SUPABASE_ANON_KEY = config.supabaseAnonKey;

      const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          flowType: "pkce",
          storageKey: "qrguys-auth-apparel",
        },
      });

      // Element References
      const qrSelectElement = document.getElementById("qrSelect");
      const qrCanvasElement = document.getElementById("qrCanvas");
      const qrUrlInputElement = document.getElementById("qrUrl");

      const apparelTextInputElement = document.getElementById("apparelText");
      const apparelImageInputElement = document.getElementById("apparelImage");
      const imagePreviewElement = document.getElementById("imagePreview");
      const inputTypeSelectorElement = document.querySelector(
        ".input-type-selector .button-group"
      );
      const textFontSelectElement = document.getElementById("text-font-select");
      const textColorInputElement = document.getElementById("text-color-input");
      const backgroundColorInputElement = document.getElementById(
        "background-color-input"
      );
      const textSizeSelectElement = document.getElementById("text-size-select");
      const apparelTextPreview = document.getElementById("apparelTextPreview");
      const urlInputGroup = document.getElementById("urlInputGroup");
      const textInputGroup = document.getElementById("textInputGroup");
      const imageInputGroup = document.getElementById("imageInputGroup");
      const videoInputGroup = document.getElementById("videoInputGroup");
      const apparelVideoInputElement = document.getElementById("apparelVideo");
      const videoUploadStatusElement =
        document.getElementById("videoUploadStatus");
      const videoProgressBarContainer = document.getElementById(
        "videoProgressBarContainer"
      );
      const videoUploadProgress = document.getElementById(
        "videoUploadProgress"
      );

      const videoPreviewElement = document.getElementById("videoPreview");
      const removeVideoBtn = document.getElementById("removeVideoBtn");
      const videoUploadLabel = document.getElementById("videoUploadLabel");
      const backBtnElement = document.getElementById("backBtn");
      const saveContentConfigBtnElement = document.getElementById(
        "saveContentConfigBtn"
      );
      const contentHistoryPanelElement =
        document.getElementById("contentHistoryPanel");
      const contentHistoryToggleElement =
        document.getElementById("contentHistoryToggle");
      const contentHistoryListElement =
        document.getElementById("contentHistoryList");
      const apparelTextPreviewContainer = document.getElementById(
        "apparelTextPreviewContainer"
      );
      // State Variables
      let currentSelectedLink = null; // Store the currently selected link object {id, link_id, url}
      let currentInputType = "url"; // 'url', 'text', 'image', 'text-image'
      let uploadedImageDataUrl = null; // Store image data URL
      let uploadedImagePublicUrl = null;
      let uploadedVideoPublicUrl = null;
      let isVideoUploading = false;
      const CONTENT_CHANGE_LOG_KEY = "qrguys.apparel.contentChangeHistory.v1";
      const CONTENT_CHANGE_PENDING_KEY = "qrguys.apparel.contentChangeHistoryPending.v1";
      const CONTENT_HISTORY_TABLE = "apparel_content_history";
      let cloudHistoryEnabled = true;
      let currentHistoryUserId = null;
      let renderedHistoryEntries = [];
      let selectedHistoryEntryId = null;

      function getApparelBackgroundColor(linkLike) {
        const raw = linkLike?.settings?.apparel_background_color;
        if (typeof raw !== "string") return "#0b0f23";
        const value = raw.trim();
        return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value)
          ? value
          : "#0b0f23";
      }

      // --- START: ADDED HELPER ---
      function escapeHtml(s) {
        return String(s).replace(
          /[&<>\"']/g,
          (m) =>
            ({
              "&": "&amp;",
              "<": "&lt;",
              ">": "&gt;",
              '"': "&quot;",
              "'": "&#39;",
            }[m])
        );
      }
      // --- END: ADDED HELPER ---

      function getContentHistoryKey(userId) {
        return `${CONTENT_CHANGE_LOG_KEY}.${String(userId || "anon")}`;
      }

      function getPendingContentHistoryKey(userId) {
        return `${CONTENT_CHANGE_PENDING_KEY}.${String(userId || "anon")}`;
      }

      function readContentHistory(userId) {
        try {
          const raw = localStorage.getItem(getContentHistoryKey(userId));
          const parsed = raw ? JSON.parse(raw) : [];
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      }

      function writeContentHistory(userId, entries) {
        try {
          localStorage.setItem(getContentHistoryKey(userId), JSON.stringify(entries));
        } catch (error) {
          console.error("Failed to write content history:", error);
        }
      }

      function readPendingContentHistory(userId) {
        try {
          const raw = localStorage.getItem(getPendingContentHistoryKey(userId));
          const parsed = raw ? JSON.parse(raw) : [];
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      }

      function writePendingContentHistory(userId, entries) {
        try {
          localStorage.setItem(
            getPendingContentHistoryKey(userId),
            JSON.stringify(entries)
          );
        } catch (error) {
          console.error("Failed to write pending content history:", error);
        }
      }

      function mergeHistoryEntries(baseEntries = [], addEntries = []) {
        const map = new Map();
        [...baseEntries, ...addEntries].forEach((entry) => {
          if (!entry || !entry.id) return;
          map.set(entry.id, entry);
        });
        return Array.from(map.values()).sort((a, b) => {
          const ta = new Date(a.timestamp || 0).getTime();
          const tb = new Date(b.timestamp || 0).getTime();
          return ta - tb;
        });
      }

      function buildHistoryEntryFromLink(updatedLink) {
        return {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          timestamp: new Date().toISOString(),
          link_id: updatedLink.link_id || "",
          content_type: updatedLink.content_type || currentInputType || "url",
          details: {
            url: updatedLink.url || "",
            text: updatedLink.text_content || "",
            image_url_override: updatedLink.image_url_override || "",
            video_uri: updatedLink.video_uri || "",
            text_color: updatedLink.text_color || "#e8ebff",
            text_font: updatedLink.text_font || "null",
            text_size: updatedLink.text_size || "16px",
            apparel_background_color: getApparelBackgroundColor(updatedLink),
          },
        };
      }

      function historyRowFromEntry(userId, entry) {
        return {
          user_id: userId,
          client_id: entry.id,
          link_id: entry.link_id,
          content_type: entry.content_type,
          details: entry.details,
          created_at: entry.timestamp,
        };
      }

      function historyEntryFromRow(row) {
        return {
          id: row.client_id || String(row.id || ""),
          timestamp: row.created_at || new Date().toISOString(),
          link_id: row.link_id || "",
          content_type: row.content_type || "url",
          details: {
            url: row.details?.url || "",
            text: row.details?.text || "",
            image_url_override: row.details?.image_url_override || "",
            video_uri: row.details?.video_uri || "",
            text_color: row.details?.text_color || "#e8ebff",
            text_font: row.details?.text_font || "null",
            text_size: row.details?.text_size || "16px",
            apparel_background_color:
              row.details?.apparel_background_color || "#0b0f23",
          },
        };
      }

      function isSchemaOrTableError(error) {
        const msg = `${error?.message || ""} ${error?.details || ""}`.toLowerCase();
        return (
          error?.code === "42P01" ||
          msg.includes("does not exist") ||
          msg.includes("relation") ||
          msg.includes("column")
        );
      }

      async function fetchContentHistoryFromSupabase(userId) {
        if (!cloudHistoryEnabled || !userId || !navigator.onLine) return null;
        try {
          const { data, error } = await sb
            .from(CONTENT_HISTORY_TABLE)
            .select("id, client_id, link_id, content_type, details, created_at")
            .eq("user_id", userId)
            .order("created_at", { ascending: true });

          if (error) throw error;
          return Array.isArray(data) ? data.map(historyEntryFromRow) : [];
        } catch (error) {
          if (isSchemaOrTableError(error)) {
            cloudHistoryEnabled = false;
          }
          console.warn("Cloud history fetch failed, using local fallback:", error);
          return null;
        }
      }

      async function syncPendingContentHistory(userId) {
        if (!cloudHistoryEnabled || !userId || !navigator.onLine) return false;
        const pending = readPendingContentHistory(userId);
        if (!pending.length) return true;

        const remaining = [];
        for (const entry of pending) {
          try {
            const { error } = await sb
              .from(CONTENT_HISTORY_TABLE)
              .insert(historyRowFromEntry(userId, entry));

            if (error) {
              const msg =
                `${error?.message || ""} ${error?.details || ""}`.toLowerCase();
              const isDuplicate =
                error?.code === "23505" || msg.includes("duplicate");
              if (isDuplicate) {
                continue;
              }
              if (isSchemaOrTableError(error)) {
                cloudHistoryEnabled = false;
              }
              remaining.push(entry);
            }
          } catch (error) {
            console.warn("Cloud history sync failed for one entry:", error);
            remaining.push(entry);
            break;
          }
        }

        writePendingContentHistory(userId, remaining);
        return remaining.length === 0;
      }

      function formatHistoryTime(isoTs) {
        const d = new Date(isoTs);
        if (Number.isNaN(d.getTime())) return "Unknown time";
        return d.toLocaleString();
      }

      function summarizeChange(entry) {
        const ct = entry?.content_type || "url";
        if (ct === "url") {
          return entry?.details?.url
            ? `URL: ${entry.details.url}`
            : "URL content updated.";
        }
        if (ct === "text") {
          return entry?.details?.text
            ? `Text: ${entry.details.text}`
            : "Text content updated.";
        }
        if (ct === "image") {
          return entry?.details?.image_url_override
            ? "Image content updated."
            : "Image content cleared.";
        }
        if (ct === "video") {
          return entry?.details?.video_uri
            ? "Video content updated."
            : "Video content cleared.";
        }
        if (ct === "text-image") {
          const textPart = entry?.details?.text ? `Text set` : `Text cleared`;
          const imagePart = entry?.details?.image_url_override
            ? `image set`
            : `image cleared`;
          return `${textPart}; ${imagePart}.`;
        }
        return "Content updated.";
      }
      function getHistoryMediaPreview(entry) {
        const videoUrl = String(entry?.details?.video_uri || "").trim();
        if (videoUrl && videoUrl.toLowerCase() !== "null") {
          return { kind: "video", url: videoUrl };
        }

        const imageUrl = String(entry?.details?.image_url_override || "").trim();
        if (imageUrl && imageUrl.toLowerCase() !== "null") {
          return { kind: "image", url: imageUrl };
        }

        return null;
      }

      function renderContentHistory(userId) {
        if (!contentHistoryListElement) return;
        currentHistoryUserId = userId || currentHistoryUserId;
        const allEntries = readContentHistory(userId);
        const lastTen = allEntries.slice(-10).reverse();
        renderedHistoryEntries = lastTen;

        if (!lastTen.length) {
          contentHistoryListElement.innerHTML =
            '<div class="content-history-empty">No content changes recorded yet.</div>';
          return;
        }

        contentHistoryListElement.innerHTML = lastTen
          .map((entry) => {
            const contentTypeLabel = String(entry.content_type || "url")
              .replace("-", " ")
              .toUpperCase();
            const qrLabel = escapeHtml(entry.link_id || "Unknown QR");
            const detail = escapeHtml(summarizeChange(entry));
            const ts = escapeHtml(formatHistoryTime(entry.timestamp));
            const isActive = entry.id === selectedHistoryEntryId ? "active" : "";
            const mediaPreview = getHistoryMediaPreview(entry);
            const mediaMarkup = mediaPreview
              ? mediaPreview.kind === "video"
                ? `
                  <div class="content-history-thumb-wrap" aria-hidden="true">
                    <video
                      class="content-history-thumb"
                      src="${escapeHtml(mediaPreview.url)}"
                      muted
                      playsinline
                      preload="metadata"
                    ></video>
                    <span class="content-history-thumb-badge">Video</span>
                  </div>
                `
                : `
                  <div class="content-history-thumb-wrap" aria-hidden="true">
                    <img
                      class="content-history-thumb"
                      src="${escapeHtml(mediaPreview.url)}"
                      alt=""
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                `
              : "";

            return `
              <button
                type="button"
                class="content-history-item ${isActive}"
                data-history-id="${escapeHtml(entry.id)}"
              >
                <div class="content-history-item-row">
                  ${mediaMarkup}
                  <div class="content-history-main">
                    <div class="content-history-item-header">
                      <span class="content-history-chip">${contentTypeLabel}</span>
                      <span class="content-history-time">${ts}</span>
                    </div>
                    <div class="content-history-link">QR: ${qrLabel}</div>
                    <div class="content-history-detail">${detail}</div>
                  </div>
                </div>
              </button>
            `;
          })
          .join("");
      }

      async function loadContentHistory(userId) {
        if (!userId) {
          renderContentHistory(userId);
          return;
        }

        currentHistoryUserId = userId;

        await syncPendingContentHistory(userId);
        const remoteEntries = await fetchContentHistoryFromSupabase(userId);

        if (remoteEntries) {
          const localEntries = readContentHistory(userId);
          const pendingEntries = readPendingContentHistory(userId);
          const merged = mergeHistoryEntries(
            mergeHistoryEntries(localEntries, remoteEntries),
            pendingEntries
          );
          writeContentHistory(userId, merged);
        }

        renderContentHistory(userId);
      }

      async function recordContentHistoryEntry(userId, updatedLink) {
        if (!userId || !updatedLink) return;
        const entry = buildHistoryEntryFromLink(updatedLink);

        const localEntries = mergeHistoryEntries(readContentHistory(userId), [entry]);
        writeContentHistory(userId, localEntries);

        const pendingEntries = mergeHistoryEntries(
          readPendingContentHistory(userId),
          [entry]
        );
        writePendingContentHistory(userId, pendingEntries);

        selectedHistoryEntryId = entry.id;
        renderContentHistory(userId);

        await syncPendingContentHistory(userId);
      }

      function setHistoryPanelCollapsed(collapsed) {
        if (!contentHistoryPanelElement || !contentHistoryToggleElement) return;
        contentHistoryPanelElement.classList.toggle("collapsed", collapsed);
        contentHistoryToggleElement.setAttribute(
          "aria-expanded",
          collapsed ? "false" : "true"
        );
      }

      function findQrOptionByLinkId(linkId) {
        if (!qrSelectElement || !linkId) return null;
        return Array.from(qrSelectElement.options || []).find((opt) => {
          if (!opt.dataset?.linkObject) return false;
          try {
            const link = JSON.parse(opt.dataset.linkObject);
            return link?.link_id === linkId;
          } catch {
            return false;
          }
        });
      }

      function applyHistoryEntry(entry) {
        if (!entry) return;

        if (!currentSelectedLink) {
          alert("Please select a QR code from the dropdown before applying history.");
          return;
        }

        // If the history entry belongs to a different QR code, confirm copy intent.
        // Do NOT switch the dropdown — apply the content to the currently selected QR.
        if (entry.link_id !== currentSelectedLink.link_id) {
          const confirmed = confirm(
            `This history entry is from QR code "${entry.link_id}".\n\nDo you want to copy its content to the currently selected QR code "${currentSelectedLink.link_id}"?\n\nClick OK to copy, or Cancel to do nothing.`
          );
          if (!confirmed) return;
        }

        // Apply content fields only — never change currentSelectedLink.id or link_id
        const details = entry.details || {};
        currentSelectedLink.content_type = entry.content_type || "url";
        currentSelectedLink.url = details.url || "";
        currentSelectedLink.text_content = details.text || "";
        currentSelectedLink.image_url_override = details.image_url_override || null;
        currentSelectedLink.video_uri = details.video_uri || null;
        currentSelectedLink.text_color = details.text_color || "#e8ebff";
        currentSelectedLink.text_font = details.text_font || "null";
        currentSelectedLink.text_size = details.text_size || "16px";
        currentSelectedLink.settings = {
          ...(currentSelectedLink.settings || {}),
          apparel_background_color:
            details.apparel_background_color || "#0b0f23",
        };

        qrUrlInputElement.value = currentSelectedLink.url || "";
        apparelTextInputElement.value = currentSelectedLink.text_content || "";
        textColorInputElement.value = currentSelectedLink.text_color;
        textFontSelectElement.value = currentSelectedLink.text_font;
        textSizeSelectElement.value = currentSelectedLink.text_size;
        backgroundColorInputElement.value = getApparelBackgroundColor(
          currentSelectedLink
        );
        uploadedImagePublicUrl = currentSelectedLink.image_url_override || null;
        uploadedVideoPublicUrl = null;

        if (uploadedImagePublicUrl) {
          imagePreviewElement.src = uploadedImagePublicUrl;
          imagePreviewElement.style.display = "block";
        } else {
          imagePreviewElement.src = "#";
          imagePreviewElement.style.display = "none";
        }

        handleInputTypeChange(currentSelectedLink.content_type);
        updateVideoPreview(currentSelectedLink);
        updateTextPreview();
        updateQrCodeDisplay();

        saveContentConfigBtnElement.disabled = false;
        selectedHistoryEntryId = entry.id;
        renderContentHistory(currentHistoryUserId);
      }

      function onContentHistoryItemClick(event) {
        const btn = event.target.closest("button[data-history-id]");
        if (!btn) return;
        const entryId = btn.dataset.historyId;
        if (!entryId) return;
        const entry = renderedHistoryEntries.find((x) => x.id === entryId);
        if (entry) applyHistoryEntry(entry);
      }

      if (contentHistoryToggleElement) {
        contentHistoryToggleElement.addEventListener("click", () => {
          const collapsed = !contentHistoryPanelElement.classList.contains("collapsed");
          setHistoryPanelCollapsed(collapsed);
        });
      }
      if (contentHistoryListElement) {
        contentHistoryListElement.addEventListener("click", onContentHistoryItemClick);
      }

      function normalizeHttpUrl(input) {
        if (!input) return ""; // Return empty string if input is null, undefined, or empty
        const u = String(input).trim();
        // Handle protocol-relative URLs (e.g., //example.com)
        if (u.startsWith("//")) return "https:" + u;
        // Check if it already has a protocol (like http:, https:, mailto:, tel:)
        if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(u)) return u;
        // If no protocol, assume https:// and remove leading slashes
        if (!u) return ""; // Handle case where input was just whitespace
        return "https://" + u.replace(/^\/+/, "");
      }

      function slugifyLinkId(input) {
        return String(input || "")
          .normalize("NFKD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-zA-Z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")
          .toLowerCase();
      }

      // --- Authentication & Initialization ---
      let linkIdToSelect = null; // Store linkId from URL
      async function associatePendingApparel() {
        // Association now requires an activation code entered by the user.
        // If a pending apparel QR ID exists in sessionStorage we show the
        // activation modal so the user must enter their code first.
        // The actual database association happens inside validateActivationCode().
        const pendingApparelId = sessionStorage.getItem("qrguys_pending_apparel_qr_id");
        if (pendingApparelId) {
          
          // Load QR codes first (shows existing owned codes while modal is open)
          const { data: { user } } = await sb.auth.getUser();
          if (user) await loadQrCodes(user.id);
          // Show the activation modal — user must enter their code
          openActivationModal();
        } else {
          
          // No pending ID, load codes normally
          const {
            data: { user },
          } = await sb.auth.getUser();
          if (user) {
             // <<< Add Log
            await loadQrCodes(user.id); // <<< MAKE SURE THIS IS AWAITED
          } else {
            console.warn(
              "No user found (no pending ID), cannot load QR codes."
            ); // <<< Add Log
          }
        }
      }

      async function fetchDataAndSetContentType(link_id) {
        if (
          !link_id ||
          !currentSelectedLink ||
          currentSelectedLink.link_id !== link_id
        ) {
          
          return;
        }
        
        try {
          const { data: fullLinkData, error } = await sb
            .from("links")
            .select(
              "content_type, text_content, image_url_override, url, qr_image_url, video_uri, text_font, text_color, text_size, settings, is_public"
            )
            .eq("link_id", link_id)
            .maybeSingle();

          if (error) throw error;

          if (fullLinkData) {
            
            currentSelectedLink = { ...currentSelectedLink, ...fullLinkData };
            document.getElementById("publicContent").checked = fullLinkData.is_public === true;

            updateQrCodeDisplay();

            qrUrlInputElement.value = currentSelectedLink.url || "";
            apparelTextInputElement.value =
              currentSelectedLink.text_content || "";

            textFontSelectElement.value = fullLinkData.text_font || "null";
            textColorInputElement.value = fullLinkData.text_color || "#e8ebff";
            textSizeSelectElement.value = fullLinkData.text_size || "16px";
            backgroundColorInputElement.value =
              getApparelBackgroundColor(fullLinkData);
            // Clear video/image inputs
            apparelVideoInputElement.value = "";
            videoUploadStatusElement.textContent = "";
            uploadedVideoPublicUrl = null;
            apparelImageInputElement.value = "";
            textFontSelectElement.value =
              currentSelectedLink.text_font || "null";
            textColorInputElement.value =
              currentSelectedLink.text_color || "#e8ebff";
            textSizeSelectElement.value =
              currentSelectedLink.text_size || "16px";
            backgroundColorInputElement.value =
              getApparelBackgroundColor(currentSelectedLink);
            uploadedImagePublicUrl = null;
            imagePreviewElement.src = "#";
            imagePreviewElement.style.display = "none";

            if (currentSelectedLink.image_url_override) {
              uploadedImagePublicUrl = currentSelectedLink.image_url_override;
              imagePreviewElement.src = uploadedImagePublicUrl;
              imagePreviewElement.style.display = "block";
            }

            if (currentSelectedLink.video_uri) {
              videoUploadStatusElement.textContent =
                "A video is already linked.";
            }
            updateTextPreview();
            updateVideoPreview(currentSelectedLink);

            const contentType = fullLinkData.content_type || "url";
            

            handleInputTypeChange(contentType);
          } else {
            console.warn(
              "Could not fetch full data for link:",
              link_id,
              "Defaulting to URL type."
            );
            handleInputTypeChange("url");
          }
        } catch (fetchError) {
          console.error(
            "Error fetching link data for content type:",
            fetchError
          );
          handleInputTypeChange("url");
        }
      }

      // --- START: MODIFIED renderAuthNav ---
      async function renderAuthNav(session) {
        const el = document.getElementById("authNav");
        if (!el) return;

        if (!session) {
          // --- Logged-out state ---
          el.innerHTML = `
              <a id="lnkLogin"  class="pill small" style="background-color: var(--muted); border-color: var(--muted); color: var(--bg); text-decoration: none;" href="/login.html?redirect_to=%2FApparel.html&app_dest=%2FApparel.html&auth_scope=apparel">Log in</a>
              <a id="lnkSignup" class="pill small" style="background-color: var(--muted); text-decoration: none; border-color: var(--muted); color: var(--bg);" href="/signup.html?redirect_to=%2FApparel.html&auth_scope=apparel">Sign up</a>
            `;
        } else {
          // --- Logged-in state (Profile Picture Dropdown) ---
          const user = session.user;
          const userEmail = user.email;
          const userMeta = user?.user_metadata || {};

          // 1. Fetch this user's data from 'profiles' table
          const { data: profile, error: profileError } = await sb
            .from("profiles")
            .select("username, avatar_url")
            .eq("id", user.id)
            .single();

          if (profileError) {
            console.error(
              "Failed to load profile for nav:",
              profileError.message
            );
          }

          // 2. Set variables using profile data, with fallbacks
          const userName =
            profile?.username ||
            userMeta.full_name ||
            userMeta.name ||
            user.email;
          const avatarUrl =
            profile?.avatar_url ||
            userMeta.avatar_url ||
            "/brand.png";

          el.innerHTML = `
                <div class="profile-dropdown-wrapper">
                    <img id="profilePictureBtn" class="profile-picture" src="${escapeHtml(
                      avatarUrl
                    )}" alt="Profile">

                    <div id="profileDropdownMenu" class="profile-dropdown-menu hidden">
                        <div class="dropdown-header">
                            <img class="profile-picture-small" src="${escapeHtml(
                              avatarUrl
                            )}" alt="Profile">
                            <div class="user-info">
                                <div class="user-name">${escapeHtml(
                                  userName
                                )}</div>
                                <div class="user-email muted">${escapeHtml(
                                  userEmail
                                )}</div>
                            </div>
                        </div>
                        
                        <a href="#apparel-help" class="dropdown-item">My Account</a>
                        
                        <a href="/" class="dropdown-item">
                            Try <span style="color: var(--accent-2);">T</span>heme<span style="color: var(--accent);">QR</span> Studio
                        </a>
                        
                        <a href="#" class="dropdown-item" id="associateApparelBtn" onclick="showActivationModal()">
                          Associate New Apparel
                        </a>
                        
                        <a href="#apparel-help" id="apparelHelpBtn" class="dropdown-item">
                            Apparel Help
                        </a>
                        <a href="#" class="dropdown-item" onclick="downloadQr()">Download QR</a>
                        <a href="/" class="dropdown-item" target="_blank">Purchase Apparel</a>
                        <div class="dropdown-divider"></div>
                        <a href="#" id="signOutBtn" class="dropdown-item">Sign Out</a>
                    </div>
                </div>
            `;

          // --- Add Event Listeners for the new dropdown ---
          const wrapper = el.querySelector(".profile-dropdown-wrapper");
          const profilePictureBtn = el.querySelector("#profilePictureBtn");
          const profileDropdownMenu = el.querySelector("#profileDropdownMenu");
          const signOutBtn = el.querySelector("#signOutBtn");
          const dropdownScanNewBtn = el.querySelector("#dropdownScanNewBtn"); // Get the button element
          const apparelHelpBtn = el.querySelector("#apparelHelpBtn");

          if (
            wrapper &&
            profilePictureBtn &&
            profileDropdownMenu &&
            signOutBtn
          ) {
            // Toggle dropdown visibility
            profilePictureBtn.addEventListener("click", (e) => {
              e.stopPropagation();
              profileDropdownMenu.classList.toggle("hidden");
            });

            // Sign out
            signOutBtn.addEventListener("click", async (e) => {
              e.preventDefault();
              await sb.auth.signOut();
              window.location.href =
                "/login.html?redirect_to=%2FApparel.html&app_dest=%2FApparel.html&auth_scope=apparel";
            });

            // Bind the alert function directly to the dynamically created element
            if (dropdownScanNewBtn) {
              dropdownScanNewBtn.removeEventListener(
                "click",
                handleScanNewAlert
              );
              dropdownScanNewBtn.addEventListener("click", handleScanNewAlert);
            }

            // Click outside to close
            document.addEventListener("click", (e) => {
              if (
                !wrapper.contains(e.target) &&
                !profileDropdownMenu.classList.contains("hidden")
              ) {
                profileDropdownMenu.classList.add("hidden");
              }
            });
          }
        }
      }
      // --- END: MODIFIED renderAuthNav ---
      function updateVideoPreview(linkData) {
        if (!config.features?.videoUpload) return;
        if (!linkData || !videoPreviewElement) {
          return;
        }

        // Default state (no video linked)
        videoPreviewElement.style.display = "none";
        removeVideoBtn.style.display = "none";
        apparelVideoInputElement.style.display = "block";
        videoUploadLabel.textContent = "Upload Video for Landing Page";
        videoUploadStatusElement.textContent = "";

        if (linkData.video_uri) {
          // A video is linked, show the preview
          videoPreviewElement.style.display = "block";
          removeVideoBtn.style.display = "block";
          apparelVideoInputElement.style.display = "none"; // Hide file input

          // Fetch thumbnail from Vimeo's public oEmbed API
          const videoId = linkData.video_uri.split("/").pop();
          fetch(
            `https://vimeo.com/api/oembed.json?url=https://vimeo.com/${videoId}`
          )
            .then((res) => {
              // --- FIX 1: Check response status ---
              if (!res.ok) {
                // If it's 404 or another error, throw error text but DON'T HIDE PREVIEW
                throw new Error(
                  `Vimeo API request failed (Status: ${res.status}).`
                );
              }
              // --- END FIX 1 ---
              return res.json();
            })
            .then((data) => {
              if (data.thumbnail_url) {
                videoPreviewElement.src = data.thumbnail_url;
              }
            })
            .catch((err) => {
              console.error("Error fetching Vimeo thumbnail:", err);
              // --- FIX 2: Remove destructive display: none ---
              // We keep the existing successful preview (from the local thumbnail) visible.
              // We only set status text to indicate failure.
            });
        }
      }
      // --- Data Loading ---
      async function loadQrCodes(userId) {
        if (!qrSelectElement) return;

        qrSelectElement.innerHTML =
          '<option value="" class="small">Loading...</option>';
        qrSelectElement.disabled = true;

        const { data: links, error } = await sb
          .from("links")
          .select("id, link_id, url, qr_image_url")
          .eq("user_id", userId)
          .eq("is_apparel", true) // <-- This filter is active
          .order("link_id", { ascending: true });

        if (error) {
          console.error("Error fetching links:", error);
          qrSelectElement.innerHTML =
            '<option value="" class="small error">Load failed</option>';
          qrSelectElement.disabled = false;
          return;
        }

        if (!links || links.length === 0) {
          qrSelectElement.innerHTML =
            '<option value="" class="small">— No QR codes found —</option>';
          qrSelectElement.disabled = false;
          return;
        }

        qrSelectElement.innerHTML =
          '<option value="">— Select QR Code —</option>';
        links.forEach((link) => {
          const option = document.createElement("option");
          option.value = link.id;
          option.textContent = link.link_id || `Link #${link.id}`;
          option.dataset.linkObject = JSON.stringify(link);
          qrSelectElement.appendChild(option);
        });

        qrSelectElement.disabled = false;
        if (linkIdToSelect) {
          
          const optionToSelect = Array.from(qrSelectElement.options).find(
            (opt) => {
              if (!opt.dataset.linkObject) return false;
              try {
                const linkData = JSON.parse(opt.dataset.linkObject);
                return linkData.link_id === linkIdToSelect;
              } catch {
                return false;
              }
            }
          );

          if (optionToSelect) {
            
            qrSelectElement.value = optionToSelect.value;

            setTimeout(() => {
              
              qrSelectElement.dispatchEvent(new Event("change"));
            }, 100);
          } else {
            console.warn(
              "Could not find option matching linkId from URL:",
              linkIdToSelect
            );
          }
          linkIdToSelect = null;
        }
      }

      // Flag and function to add listeners ONLY ONCE
      let listenersAdded = false;
      function addEventListenersOnce() {
        if (listenersAdded) {
          
          return;
        }
        

        if (qrSelectElement) {
          qrSelectElement.addEventListener("change", (event) => {
            
            const selectedOption = event.target.selectedOptions[0];
            
            if (selectedOption && selectedOption.dataset.linkObject) {
              
              try {
                const linkData = JSON.parse(selectedOption.dataset.linkObject);
                
                handleQrSelect(linkData);
              } catch (e) {
                console.error("Failed to parse link data from option", e);
                handleQrSelect(null);
              }
            } else {
              
              handleQrSelect(null);
            }
          });
          
        } else {
          console.error(
            "FAILED to add dropdown listener: qrSelectElement not found!"
          );
        }

        if (inputTypeSelectorElement) {
          inputTypeSelectorElement.addEventListener("click", (e) => {
            
            const button = e.target.closest("button[data-input-type]");
            
            
            if (!button) {
              
              return;
            }
            const inputType = button.dataset.inputType;
            
            
            handleInputTypeChange(inputType);
          });
          
        } else {
          console.error(
            "FAILED to add button group listener: inputTypeSelectorElement not found!"
          );
        }

        if (apparelTextInputElement) {
          apparelTextInputElement.addEventListener("input", () => {
            if (
              currentInputType === "text" ||
              currentInputType === "text-image"
            ) {
              if (saveContentConfigBtnElement) {
                saveContentConfigBtnElement.disabled = !currentSelectedLink;
              }
            }
          });
          
        } else {
          console.error(
            "FAILED to add text input listener: apparelTextInputElement not found!"
          );
        }

        if (apparelVideoInputElement) {
          apparelVideoInputElement.addEventListener(
            "change",
            handleVideoUpload
          );
          
        } else {
          console.error(
            "FAILED to add video input listener: apparelVideoInputElement not found!"
          );
        }

        if (qrUrlInputElement) {
          qrUrlInputElement.addEventListener("input", () => {
            if (saveContentConfigBtnElement) {
              saveContentConfigBtnElement.disabled = !currentSelectedLink;
            }
          });
          
        } else {
          console.error(
            "FAILED to add URL input listener: qrUrlInputElement not found!"
          );
        }

        if (apparelImageInputElement) {
          apparelImageInputElement.addEventListener(
            "change",
            handleImageUpload
          );
          
        } else {
          console.error(
            "FAILED to add image input listener: apparelImageInputElement not found!"
          );
        }

        if (removeVideoBtn) {
          removeVideoBtn.addEventListener("click", () => {
            if (!confirm("Are you sure you want to remove this video?")) return;

            currentSelectedLink.video_uri = null; // Clear the URI
            uploadedVideoPublicUrl = null; // Clear any pending upload

            updateVideoPreview(currentSelectedLink); // Reset the UI

            apparelVideoInputElement.value = ""; // Clear file input
            saveContentConfigBtnElement.disabled = !currentSelectedLink; // Enable save
          });
          
        }

        if (saveContentConfigBtnElement) {
          saveContentConfigBtnElement.addEventListener(
            "click",
            handleSaveContentConfig
          );
          
        } else {
          console.error(
            "FAILED to add save config listener: saveContentConfigBtnElement not found!"
          );
        }

        listenersAdded = true;
        
      }

      function handleQrSelect(link) {
        
        if (link) {
          currentSelectedLink = link;
          qrUrlInputElement.value = link.url || "";
          updateQrCodeDisplay();
          saveContentConfigBtnElement.disabled = false;
          fetchDataAndSetContentType(link.link_id);
        } else {
          currentSelectedLink = null;
          qrUrlInputElement.value = "";
          updateQrCodeDisplay();
          saveContentConfigBtnElement.disabled = true;

          handleInputTypeChange("url");
          apparelTextInputElement.value = "";
          textFontSelectElement.value = "null";
          textColorInputElement.value = "#e8ebff";
          textSizeSelectElement.value = "16px";
          backgroundColorInputElement.value = "#0b0f23";
          apparelImageInputElement.value = "";
          uploadedImageDataUrl = null;
          uploadedImagePublicUrl = null;
          imagePreviewElement.src = "#";
          imagePreviewElement.style.display = "none";

          // <-- ADD THESE 3 LINES FOR  NEW VIDEO FUNCTION -->
          apparelVideoInputElement.value = "";
          videoUploadStatusElement.textContent = "";
          uploadedVideoPublicUrl = null;
          updateVideoPreview(null);
          updateTextPreview();
        }
      }

      function handleInputTypeChange(newType) {
        if (["image", "text-image"].includes(newType) && !config.features?.imageUpload) {
          alert("Image hosting is not available yet. Choose text or a website link."); return;
        }
        if (newType === "video" && !config.features?.videoUpload) {
          alert("Video hosting is not available yet. Choose text, an image, or a website link."); return;
        }
        
        currentInputType = newType;

        if (inputTypeSelectorElement) {
          inputTypeSelectorElement.querySelectorAll("button").forEach((btn) => {
            btn.classList.toggle("active", btn.dataset.inputType === newType);
          });
          
        } else {
          console.error(
            "Could not find inputTypeSelectorElement for button styling!"
          );
        }

        if (urlInputGroup) {
          urlInputGroup.style.display = newType === "url" ? "flex" : "none";
        } else {
          console.error("urlInputGroup element not found!");
        }

        const isTextMode = newType === "text" || newType === "text-image";

        if (textInputGroup) {
          textInputGroup.style.display = isTextMode ? "flex" : "none";
        } else {
          console.error("textInputGroup element not found!");
        }
        if (apparelTextPreviewContainer) {
          // Show the preview only when in Text or Text & Image mode
          apparelTextPreviewContainer.style.display = isTextMode
            ? "grid"
            : "none";
        }

        if (isTextMode) {
          // This ensures the preview is rendered immediately when the tab is switched
          // or when a QR code link is loaded via fetchDataAndSetContentType.
          updateTextPreview();
        }
        // --- NEW LOGIC FOR TEXT PREVIEW START ---
        if (apparelTextPreviewContainer) {
          // Show the preview only when in Text or Text & Image mode
          // We use 'grid' because that's how we styled the container for centering
          apparelTextPreviewContainer.style.display = isTextMode
            ? "grid"
            : "none";
        }

        if (isTextMode) {
          // Ensure the preview updates when the tab is switched
          updateTextPreview();
        }
        // --- NEW LOGIC FOR TEXT PREVIEW END ---

        if (imageInputGroup) {
          imageInputGroup.style.display =
            newType === "image" || newType === "text-image" ? "flex" : "none";
        } else {
          console.error("imageInputGroup element not found!");
        }

        // <-- MODIFIED BLOCK -->
        if (videoInputGroup) {
          const isVideo = newType === "video";
          videoInputGroup.style.display = newType === "video" ? "flex" : "none";

          // Explicitly show the label only when the video type is active
          if (videoUploadLabel) {
            videoUploadLabel.style.display = isVideo ? "block" : "none";
          }

          if (isVideo) {
            updateVideoPreview(currentSelectedLink);
          }
        } else {
          console.error("videoInputGroup element not found!");
        }
        // <-- END MODIFIED BLOCK -->

        if (saveContentConfigBtnElement) {
          saveContentConfigBtnElement.disabled = !currentSelectedLink;
        } else {
          console.error("saveContentConfigBtnElement not found!");
        }
      }

      async function handleVideoUpload(event) {
        if (!config.features?.videoUpload) return;
        // Element references must be defined locally or be available in the global scope
        const videoProgressBarContainer = document.getElementById(
          "videoProgressBarContainer"
        );
        // REMOVED: const videoUploadProgress = document.getElementById("videoUploadProgress");
        const videoUploadPercentage = document.getElementById(
          "videoUploadPercentage"
        );

        // Reset preview / state
        videoPreviewElement.style.display = "none";
        removeVideoBtn.style.display = "none";
        apparelVideoInputElement.style.display = "block";
        const file = event.target.files[0];
        videoUploadStatusElement.textContent = "";
        uploadedVideoPublicUrl = null;
        isVideoUploading = false;

        if (!file) return;

        // Max size check (250 MB – adjust if you want)
        const MAX_SIZE_MB = 500;
        if (file.size > MAX_SIZE_MB * 1024 * 1024) {
          videoUploadStatusElement.textContent = `Error: File is too large (max ${MAX_SIZE_MB}MB).`;
          apparelVideoInputElement.value = "";
          return;
        }

        // Show progress container (starts the CSS animation)
        videoProgressBarContainer.style.display = "block";
        // REMOVED: videoUploadProgress.value = 0; // Removed progress bar value setting
        videoUploadPercentage.textContent = "0%";
        saveContentConfigBtnElement.disabled = true;
        isVideoUploading = true;

        // We use a fake timer to show progress since Supabase storage upload doesn't emit XHR progress events
        let fakePercent = 0;
        const fakeTimer = setInterval(() => {
          if (fakePercent < 95) {
            fakePercent += 1;
          }
          // Soft bounce so it doesn't look stuck
          else {
            fakePercent = 95 + Math.floor(Math.random() * 3); // 95–97%
          }
          // REMOVED: if (videoUploadProgress) videoUploadProgress.value = fakePercent; // Removed progress bar value setting
          if (videoUploadPercentage)
            videoUploadPercentage.textContent = `${fakePercent}%`;
        }, 500);

        videoUploadStatusElement.textContent = `Uploading "${file.name}".`;

        try {
          const {
            data: { session },
            error: sessionError,
          } = await sb.auth.getSession();

          if (sessionError || !session) {
            console.error("Session invalid or expired. Redirecting to login.");
            window.location.href =
              "/login.html?redirect_to=%2FApparel.html&app_dest=%2FApparel.html&auth_scope=apparel";
            throw new Error("Session expired. Please log in again.");
          }

          // Now we can safely get the user ID from the valid session
          const user = session.user;

          // We'll upload to a "apparel-videos" folder for organization
          const filePath = `apparel-videos/${user.id}/${Date.now()}_${
            file.name
          }`;

          // Do the actual upload (no real progress events from Supabase here)
          const { error: uploadError } = await sb.storage
            .from("apparel-images")
            .upload(filePath, file, {
              cacheControl: "31536000",
              upsert: false,
              contentType: file.type, // This is important for videos
            });

          // Stop fake progress updates
          clearInterval(fakeTimer);

          if (uploadError) throw uploadError;

          // Jump percentage text to 100% and briefly show it
          // REMOVED: if (videoUploadProgress) videoUploadProgress.value = 100; // Removed progress bar value setting
          if (videoUploadPercentage) {
            videoUploadPercentage.textContent = "100% (Complete)";
          }

          // Get the public URL
          const { data: publicUrlData } = sb.storage
            .from("apparel-images") // Must be same bucket as above
            .getPublicUrl(filePath);

          if (!publicUrlData || !publicUrlData.publicUrl) {
            throw new Error("Could not get public URL after upload.");
          }

          uploadedVideoPublicUrl = publicUrlData.publicUrl;
          videoUploadStatusElement.textContent = `Upload complete: ${file.name}`;
          isVideoUploading = false;
          saveContentConfigBtnElement.disabled = !currentSelectedLink;

          // Hide progress bar after a short delay
          setTimeout(() => {
            if (videoProgressBarContainer) {
              videoProgressBarContainer.style.display = "none";
            }
          }, 2000);

          // Preview is handled in handleSaveContentConfig after Vimeo processing
          // so no need to call updateVideoPreview() here.
        } catch (error) {
          clearInterval(fakeTimer);
          console.error("Video upload error:", error);
          videoUploadStatusElement.textContent = `Upload failed: ${error.message}`;
          videoProgressBarContainer.style.display = "none";
          apparelVideoInputElement.value = ""; // Clear the file input
          isVideoUploading = false;
          saveContentConfigBtnElement.disabled = !currentSelectedLink;
        }
      }

      async function handleImageUpload(event) {
        if (!config.features?.imageUpload) return;
        const file = event.target.files[0];
        imagePreviewElement.style.display = "none";
        imagePreviewElement.src = "#";
        uploadedImageDataUrl = null;
        uploadedImagePublicUrl = null;

        if (!file) return;
        // Read the file into memory IMMEDIATELY on selection.
        // On iPhone, the picked photo can become empty (0 bytes) if read
        // later — iCloud-offloaded photos and Safari temp-file cleanup
        // both cause silent 0-byte uploads. Reading now forces the real
        // bytes into memory and lets us reject empty files loudly.
        let uploadBlob;
        try {
          const fileBuffer = await file.arrayBuffer();
          if (!fileBuffer || fileBuffer.byteLength === 0) {
            alert(
              "The selected photo is empty (0 bytes). If it is stored in iCloud, open it full-screen in the Photos app first so it downloads to your phone, then try uploading again."
            );
            apparelImageInputElement.value = "";
            return;
          }
          uploadBlob = new Blob([fileBuffer], {
            type: file.type || "image/jpeg",
          });
        } catch (readErr) {
          console.error("Could not read selected photo:", readErr);
          alert(
            "Could not read the selected photo. Please pick it again (make sure it has fully downloaded from iCloud)."
          );
          apparelImageInputElement.value = "";
          return;
        }
        // --- FIX: Ensure the ID matches the HTML element you added ---
        const imageProgressBarContainer = document.getElementById(
          "imageProgressBarContainer"
        );
        const imageUploadPercentage = document.getElementById(
          "imageUploadPercentage"
        );

        // CRITICAL CHECK: If the element is still null, throw an error to help debug the HTML.
        if (!imageProgressBarContainer) {
          console.error(
            "Missing HTML element: imageProgressBarContainer. Check your HTML structure."
          );
          alert(
            "Configuration Error: The progress bar element is missing from the page."
          );
          return;
        }

        try {
          const {
            data: { session },
            error: sessionError,
          } = await sb.auth.getSession();

          if (sessionError || !session) {
            console.error("Session invalid or expired.");
            window.location.href =
              "/login.html?redirect_to=%2FApparel.html&app_dest=%2FApparel.html&auth_scope=apparel";
            return;
          }

          const user = session.user;
          const parts = file.name.split(".");
          const extension = parts.length > 1 ? "." + parts.pop() : "";
          const baseName = parts.join(".");
          const sanitizedName = slugifyLinkId(baseName) + extension;
          const filePath = `apparel/${user.id}/${Date.now()}_${sanitizedName}`;

          // Get signed URL
          const { data: signedUrlData, error: signedUrlError } =
            await sb.storage
              .from("apparel-images")
              .createSignedUploadUrl(filePath);

          if (signedUrlError || !signedUrlData) {
            throw new Error("Failed to create signed upload URL.");
          }

          // Real upload using XMLHttpRequest
          imageProgressBarContainer.style.display = "block";
          imageUploadPercentage.textContent = "0%";

          const xhr = new XMLHttpRequest();
          xhr.open("PUT", signedUrlData.signedUrl, true);

          xhr.upload.onprogress = function (e) {
            if (e.lengthComputable) {
              const percent = Math.round((e.loaded / e.total) * 100);
              imageUploadPercentage.textContent = `${percent}%`;
            }
          };

          xhr.onload = async function () {
            if (xhr.status >= 200 && xhr.status < 300) {
              const { data: publicUrlData } = sb.storage
                .from("apparel-images")
                .getPublicUrl(filePath);

              if (!publicUrlData || !publicUrlData.publicUrl) {
                throw new Error("Could not get public URL after upload.");
              }

              uploadedImagePublicUrl = publicUrlData.publicUrl;
              imagePreviewElement.src = uploadedImagePublicUrl;
              imagePreviewElement.style.display = "block";

              imageUploadPercentage.textContent = `100% (Complete)`;

              setTimeout(() => {
                imageProgressBarContainer.style.display = "none";
              }, 1000);

              if (["image", "text-image"].includes(currentInputType)) {
                handleSaveContentConfig();
              }
            } else {
              throw new Error("Upload failed with status " + xhr.status);
            }
          };

          xhr.onerror = function () {
            throw new Error("XHR upload failed.");
          };

          xhr.send(uploadBlob);
        } catch (error) {
          console.error("Image upload error:", error);
          alert(`Image upload failed: ${error.message}`);
          imageProgressBarContainer.style.display = "none";
          apparelImageInputElement.value = "";
        }
      }

      function updateQrCodeDisplay() {
        
        qrCanvasElement.innerHTML = "";

        if (
          !currentSelectedLink ||
          !currentSelectedLink.link_id ||
          !currentSelectedLink.qr_image_url
        ) {
          qrCanvasElement.innerHTML =
            '<span class="small">Select a QR code</span>';
          console.warn(
            "No valid link or qr_image_url to display. Showing placeholder."
          );
          return;
        }

        const qrImage = document.createElement("img");
        qrImage.src = currentSelectedLink.qr_image_url;
        qrImage.alt = `QR Code for ${currentSelectedLink.link_id}`;
        qrImage.style.maxWidth = "100%";
        qrImage.style.height = "auto";

        qrCanvasElement.appendChild(qrImage);
        
      }

      async function pollForVimeoLink(
        linkDbId,
        maxAttempts = 180,
        interval = 1000
      ) {
        const saveBtn = document.getElementById("saveContentConfigBtn");
        const statusDiv = document.getElementById("videoUploadStatus");
        let attempts = 0;

        return new Promise((resolve) => {
          saveBtn.textContent = "Processing Video...";
          saveBtn.disabled = true;

          const poller = setInterval(async () => {
            attempts++;
            statusDiv.textContent = `Vimeo processing... (Attempt ${attempts}/${maxAttempts})`;

            const { data, error } = await sb
              .from("links")
              .select("video_uri")
              .eq("id", linkDbId)
              .maybeSingle();

            if (data && data.video_uri) {
              clearInterval(poller);
              statusDiv.textContent = "Video link established.";
              saveBtn.textContent = "Save Content for QR Code";
              saveBtn.disabled = false;
              resolve(data.video_uri);
            } else if (attempts >= maxAttempts || error) {
              clearInterval(poller);
              statusDiv.textContent =
                "Processing is taking longer than usual (still running). You can continue working, and the thumbnail will appear once encoding is complete.";
              saveBtn.textContent = "Save Content for QR Code";
              saveBtn.disabled = false;
              resolve(null);
            }
          }, interval);
        });
      }
      async function handleSaveContentConfig() {
        if (["image", "text-image"].includes(currentInputType) && !config.features?.imageUpload) return;
        if (currentInputType === "video" && !config.features?.videoUpload) return;
        if (!currentSelectedLink) {
          alert("Please select a QR code first.");
          return;
        }

        if (isVideoUploading) {
          alert("Please wait for the video upload to finish.");
          return;
        }

        saveContentConfigBtnElement.disabled = true;
        saveContentConfigBtnElement.textContent = "Saving...";

        let existingSettings =
          currentSelectedLink?.settings &&
          typeof currentSelectedLink.settings === "object"
            ? currentSelectedLink.settings
            : {};

        if (
          (!existingSettings || Object.keys(existingSettings).length === 0) &&
          currentSelectedLink?.id
        ) {
          try {
            const { data: settingsRow } = await sb
              .from("links")
              .select("settings")
              .eq("id", currentSelectedLink.id)
              .maybeSingle();
            if (
              settingsRow?.settings &&
              typeof settingsRow.settings === "object"
            ) {
              existingSettings = settingsRow.settings;
            }
          } catch (settingsFetchError) {
            console.warn(
              "Could not fetch existing settings before save:",
              settingsFetchError
            );
          }
        }

        const updatePayload = {
          is_public: document.getElementById("publicContent").checked,
          content_type: currentInputType,
          text_content: null,
          image_url_override: null,
          video_uri: null, // Default to null
          url: null, // Default to null
          text_color: textColorInputElement.value || "#e8ebff",
          text_font:
            textFontSelectElement.value === "null"
              ? null
              : textFontSelectElement.value,
          text_size: textSizeSelectElement.value || "16px",
          settings: {
            ...existingSettings,
            apparel_background_color:
              backgroundColorInputElement.value || "#0b0f23",
          },
        };

        try {
          // --- Handle each content type ---
          if (currentInputType === "video") {
            if (!uploadedVideoPublicUrl && !currentSelectedLink.video_uri) {
              // This means no new video was uploaded AND no video was previously saved
              throw new Error("No video has been uploaded yet.");
            }

            let finalVideoUri = currentSelectedLink.video_uri;

            // If a new video was just uploaded to storage, send it to Vimeo
            if (uploadedVideoPublicUrl) {
              saveContentConfigBtnElement.textContent = "Sending to Vimeo...";

              const { data: vimeoData, error: funcError } =
                await sb.functions.invoke("vimeo-pull-upload", {
                  body: {
                    video_url: uploadedVideoPublicUrl,
                    video_name: currentSelectedLink.link_id,
                  },
                });

              if (funcError) throw funcError;
              if (vimeoData.error) throw new Error(vimeoData.error);

              finalVideoUri = vimeoData.video_uri;
              
            }

            updatePayload.video_uri = finalVideoUri;
          } else if (currentInputType === "url") {
            const editedUrl = qrUrlInputElement.value.trim();
            updatePayload.url = editedUrl ? normalizeHttpUrl(editedUrl) : null;
          } else if (currentInputType === "text") {
            updatePayload.text_content =
              apparelTextInputElement.value.trim() || null;
          } else if (currentInputType === "image") {
            updatePayload.image_url_override = uploadedImagePublicUrl || null;
          } else if (currentInputType === "text-image") {
            updatePayload.text_content =
              apparelTextInputElement.value.trim() || null;
            updatePayload.image_url_override = uploadedImagePublicUrl || null;
          }

          

          const { data: updatedLink, error } = await sb
            .from("links")
            .update(updatePayload)
            .eq("id", currentSelectedLink.id)
            .select() // Re-fetch the entire row
            .single();

          if (error) throw error;

          alert(
            `Content configuration saved for QR code: ${currentSelectedLink.link_id}`
          );

          const {
            data: { user: saveUser },
          } = await sb.auth.getUser();
          await recordContentHistoryEntry(saveUser?.id, updatedLink);

          // --- Reload state ---
          currentSelectedLink = updatedLink; // Use the newly saved data

          // Re-populate dropdown and re-select
          const {
            data: { user },
          } = await sb.auth.getUser();
          if (user) {
            await loadQrCodes(user.id);
            if (currentSelectedLink) {
              qrSelectElement.value = currentSelectedLink.id;
            }
          }

          // Manually re-populate fields from the new 'updatedLink'
          qrUrlInputElement.value = updatedLink.url || "";
          apparelTextInputElement.value = updatedLink.text_content || "";
          textFontSelectElement.value = updatedLink.text_font || "null";
          textColorInputElement.value = updatedLink.text_color || "#e8ebff";
          textSizeSelectElement.value = updatedLink.text_size || "16px";
          backgroundColorInputElement.value = getApparelBackgroundColor(
            updatedLink
          );
          if (updatedLink.image_url_override) {
            imagePreviewElement.src = updatedLink.image_url_override;
            imagePreviewElement.style.display = "block";
          } else {
            imagePreviewElement.src = "#";
            imagePreviewElement.style.display = "none";
          }

          // Re-sync the UI with the saved state
          handleInputTypeChange(updatedLink.content_type);

          // --- FIX: Video Preview Refresh ---
          // Since the video was just updated/claimed, ensure the UI reflects the permanent link.
          // The updateVideoPreview function will now reliably use the stored video_uri.

          updateVideoPreview(currentSelectedLink);
          // --- END FIX ---
        } catch (error) {
          console.error("Error saving content configuration:", error);
          alert(`Failed to save configuration: ${error.message}`);
        } finally {
          saveContentConfigBtnElement.disabled = !currentSelectedLink;
          saveContentConfigBtnElement.textContent = "Save Content for QR Code";
        }
      }

      function handleDownload() {
        if (!currentSelectedLink) return;
        const qrImage = qrCanvasElement.querySelector("img");
        if (!qrImage || !qrImage.src) {
          alert("QR code image not found.");
          return;
        }
        const downloadLink = document.createElement("a");
        downloadLink.href = qrImage.src;
        downloadLink.download = `QR_${
          currentSelectedLink.link_id || currentSelectedLink.id
        }.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      }

      // ===============================================
      // START: MOVED function associatePendingApparelOnLoad
      // ===============================================

      /**
       * Checks for and attempts to associate a pending QR ID from sessionStorage.
       * This function MUST be defined in the global scope (outside DOMContentLoaded)
       * to avoid the ReferenceError.
       */
      async function associatePendingApparelOnLoad() {
        // Association now requires the user to enter an activation code.
        // If a pending_apparel_qr_id exists we show the activation modal
        // instead of calling the edge function directly.
        // The actual DB association happens inside validateActivationCode().
        const pendingApparelId = sessionStorage.getItem("qrguys_pending_apparel_qr_id");
        if (pendingApparelId) {
          
          openActivationModal();
        }
      }

      // ===============================================
      // END: MOVED function associatePendingApparelOnLoad
      // ===============================================

      /**
       * Generates a thumbnail Data URL from a local video File object.
       * @param {File} file - The selected video file.
       * @returns {Promise<string>} - A promise resolving to a JPEG Data URL.
       */
      function generateVideoThumbnail(file) {
        return new Promise((resolve) => {
          const video = document.createElement("video");
          video.preload = "metadata";
          video.muted = true;
          video.src = URL.createObjectURL(file);

          // Use loadedmetadata event for initial setup
          video.onloadedmetadata = () => {
            // Crucial: Set a slight delay to ensure a frame is ready
            video.currentTime = 0.1;
          };

          // Use seeked event to confirm a frame is available at currentTime
          video.onseeked = () => {
            // Add a small delay (100ms) to ensure the browser paints the frame
            setTimeout(() => {
              const canvas = document.createElement("canvas");
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;

              const ctx = canvas.getContext("2d");

              // Draw the ready frame
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

              // Convert and resolve
              const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
              URL.revokeObjectURL(video.src);
              resolve(dataUrl);
            }, 100); // 100ms delay to ensure render
          };

          // Handle error
          video.onerror = () => {
            console.error("Failed to load video metadata for thumbnail.");
            URL.revokeObjectURL(video.src);
            resolve(null);
          };

          video.load();
        });
      }

      /**
       * Global function to handle the 'Scan New Apparel' button click/alert.
       * Defined here to ensure it's available before renderAuthNav is called.
       */
      const handleScanNewAlert = (e) => {
        e.preventDefault();
        alert(
          "To add new apparel, please use your phone's camera app to scan the QR code on the item."
        );
      };

      async function initializeApparel() {
        

        const params = new URLSearchParams(window.location.search);
        linkIdToSelect = params.get("linkId");
        if (linkIdToSelect) {
          
        }

        const {
          data: { session },
          error: sessionError,
        } = await sb.auth.getSession();

        if (sessionError) {
          console.error("Error getting initial session:", sessionError);
          return;
        }

        if (!session) {
          
          let loginRedirectUrl =
            "/login.html?redirect_to=%2FApparel.html&app_dest=%2FApparel.html&auth_scope=apparel";
          if (linkIdToSelect) {
            loginRedirectUrl += `&linkId=${encodeURIComponent(linkIdToSelect)}`;
          }
          window.location.href = loginRedirectUrl;
          return;
        }

        

        await associatePendingApparelOnLoad();

        // RENDER NAV & BIND DROPDOWN CLICKS
        const bindDropdownActions = (currentSession) => {
          renderAuthNav(currentSession);
        };

        bindDropdownActions(session);
        await loadContentHistory(session.user.id);

        if (!sessionStorage.getItem("qrguys_pending_apparel_qr_id")) {
          await loadQrCodes(session.user.id);
        }

        addEventListenersOnce();

        
      }

      sb.auth.onAuthStateChange((event, currentSession) => {
        

        // Update nav and re-bind actions on all auth events
        if (currentSession) {
          // Re-call the binding logic on auth state changes too
          renderAuthNav(currentSession);
          loadContentHistory(currentSession.user.id);
        } else if (event === "SIGNED_OUT" || !currentSession) {
          
          currentHistoryUserId = null;
          currentSelectedLink = null;
          window.location.href =
            "/login.html?redirect_to=%2FApparel.html&app_dest=%2FApparel.html&auth_scope=apparel";
        }
      });

      window.addEventListener("online", () => {
        if (currentHistoryUserId) {
          loadContentHistory(currentHistoryUserId);
        }
      });

      let validatedLink = null;

      function showActivationModal() {
        document.getElementById("activationModal").style.display = "block";
        document.getElementById("activationModalOverlay").style.display =
          "block";
      }

      function closeActivationModal() {
        document.getElementById("activationModal").style.display = "none";
        document.getElementById("activationModalOverlay").style.display =
          "none";
      }

      // Escape key closes modal
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          closeActivationModal();
        }
      });
      async function validateActivationCode() {
        const code = document
          .getElementById("activationCodeInput")
          .value.trim();
        if (!code) {
          alert("Please enter a code.");
          return;
        }

        // Use the associate-apparel-qr edge function — it runs with the
        // service role key and can bypass RLS to write user_id on the link.
        // Passing activation_code lets the function verify it server-side.
        try {
          const { data: { session } } = await sb.auth.getSession();
          if (!session?.access_token) throw new Error("Please sign in again.");
          const response = await fetch("/api/associate-apparel-qr", {
            method: "POST", headers: {"Content-Type": "application/json", Authorization: `Bearer ${session.access_token}`},
            body: JSON.stringify({activation_code: code})
          });
          const funcData = await response.json();
          if (!response.ok) throw new Error(funcData.error || "Activation failed.");

          if (!funcData?.success) {
            alert(funcData?.error || "Invalid or already-used activation code.");
            return;
          }

          // ✅ Success — clear the pending session flag and reload
          sessionStorage.removeItem("qrguys_pending_apparel_qr_id");
          alert("Your apparel has been successfully linked to your account 🎉");
          closeActivationModal();
          location.reload();
          validatedLink = null;

        } catch (err) {
          alert("Something went wrong while associating the apparel. Please try again.");
          console.error("validateActivationCode error:", err);
        }
      }
      function updateTextPreview() {
        // 1. Get Values from existing controls
        const font =
          textFontSelectElement.value === "null"
            ? "var(--sans), sans-serif"
            : textFontSelectElement.value;
        const color = textColorInputElement.value || "#e8ebff";
        const size = textSizeSelectElement.value || "16px";
        const bgColor = backgroundColorInputElement.value || "#0b0f23";

        // 2. Apply styles directly to the input box (apparelText)
        if (apparelTextInputElement) {
          apparelTextInputElement.style.fontFamily = font;
          apparelTextInputElement.style.color = color;
          apparelTextInputElement.style.fontSize = size;
          apparelTextInputElement.style.backgroundColor = bgColor;
          apparelTextInputElement.style.borderColor = "rgba(255,255,255,0.25)";
        }
      }

      // Text content changes
      apparelTextInputElement.addEventListener("input", updateTextPreview);

      // Font selection changes
      textFontSelectElement.addEventListener("change", updateTextPreview);

      // Color changes (use 'input' for live color picker updates)
      textColorInputElement.addEventListener("input", updateTextPreview);
      backgroundColorInputElement.addEventListener("input", updateTextPreview);

      // Size selection changes
      textSizeSelectElement.addEventListener("change", updateTextPreview);
      updateTextPreview();

      function downloadQr() {
        const qrContainer = document.getElementById("qrCanvas");
        if (!qrContainer) {
          alert("QR container not found.");
          return;
        }

        const qrImage = qrContainer.querySelector("img");
        if (
          !qrImage ||
          !qrImage.src ||
          qrImage.src === "#" ||
          qrImage.src.includes("placeholder")
        ) {
          alert("No QR code selected to download.");
          return;
        }

        // Fetch the image as a blob to force download (bypasses browser preview)
        fetch(qrImage.src)
          .then((response) => {
            if (!response.ok) throw new Error("Fetch failed");
            return response.blob();
          })
          .then((blob) => {
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `qrguys-apparel-${
              validatedLink?.link_id || "qr"
            }.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url); // Clean up
          })
          .catch((err) => {
            console.error("Download failed:", err);
            alert(
              "Failed to download QR code. Try right-clicking the image and 'Save image as...'"
            );
          });
      }

for (const type of ["image", "text-image"]) {
 const option = document.querySelector(`[data-input-type="${type}"]`);
 if (option && !config.features?.imageUpload) { option.disabled = true; option.title = "Image hosting is not configured"; }
}
if (!config.features?.imageUpload) apparelImageInputElement.disabled = true;
if (!config.features?.videoUpload) apparelVideoInputElement.disabled = true;
const videoOption = document.querySelector('[data-input-type="video"]');
if (videoOption && !config.features?.videoUpload) { videoOption.disabled = true; videoOption.title = "Video hosting is not configured"; }
initializeApparel().catch(() => window.QRGuysSetupState("The apparel service could not start. Please try again later."));
