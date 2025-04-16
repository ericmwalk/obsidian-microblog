import { App, Notice, TFile, requestUrl } from "obsidian";

// Helper: Extract ![[...image]] from content
function extractImageLinks(content: string): string[] {
  const regex = /!\[\[([^\]]+\.(png|jpe?g|gif|webp|bmp))\]\]/gi;
  return [...content.matchAll(regex)].map(match => match[1]);
}

// Helper: Get MIME type
function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case "jpg":
    case "jpeg": return "image/jpeg";
    case "png": return "image/png";
    case "gif": return "image/gif";
    case "webp": return "image/webp";
    case "bmp": return "image/bmp";
    default: return "application/octet-stream";
  }
}

// Alt text fallback
function generateBasicAltText(filename: string): string {
  return filename.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
}

// Core logic
export async function uploadAndReplaceImages(
  app: App,
  apiToken: string,
  deleteAfterUpload = false,
  useChatGPT = false,
  chatGPTApiKey = ''
) {
  const view = app.workspace.getActiveViewOfType(app.workspace.activeLeaf?.view.constructor as any);
  const editor = (view as any)?.editor;

  if (!editor) {
    console.error("No active editor found.");
    return;
  }

  let content = editor.getValue();
  const imageLinks = extractImageLinks(content);

  if (imageLinks.length === 0) {
    new Notice("No image links found to upload.");
    return;
  }

  for (const filename of imageLinks) {
    try {
      const file = app.vault.getFiles().find(f => f.name === filename);
      if (!file || !(file instanceof TFile)) {
        console.error(`File not found or not a valid image: ${filename}`);
        continue;
      }

      const arrayBuffer = await app.vault.readBinary(file);
      const mimeType = getMimeType(filename);

      // 🧪 Create manual multipart/form-data body
      const boundary = "----WebKitFormBoundary" + crypto.randomUUID().replace(/-/g, "");
      const pre = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`;
      const post = `\r\n--${boundary}--\r\n`;

      const preBytes = new TextEncoder().encode(pre);
      const postBytes = new TextEncoder().encode(post);

      const combined = new Uint8Array(preBytes.length + arrayBuffer.byteLength + postBytes.length);
      combined.set(preBytes, 0);
      combined.set(new Uint8Array(arrayBuffer), preBytes.length);
      combined.set(postBytes, preBytes.length + arrayBuffer.byteLength);

      const response = await requestUrl({
        url: "https://micro.blog/micropub/media",
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": `multipart/form-data; boundary=${boundary}`
        },
        body: combined.buffer
      });

      const location = response.headers["Location"] || response.headers["location"];
      if (!location) {
        console.warn(`No URL returned for ${filename}`);
        continue;
      }

      // 🧠 GPT-4o Alt text using actual uploaded image location
      let altText = generateBasicAltText(filename);
      if (useChatGPT && chatGPTApiKey && location) {
        try {
          console.log(`[GPT Debug] Using Micro.blog image URL: ${location}`);
          const chatRes = await requestUrl({
            url: "https://api.openai.com/v1/chat/completions",
            method: "POST",
            headers: {
              Authorization: `Bearer ${chatGPTApiKey}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              model: "gpt-4o",
              messages: [
                {
                  role: "user",
                  content: [
                    {
                      type: "text",
                      text: "Write a short, descriptive alt text for the image. Keep it concise and relevant."
                    },
                    {
                      type: "image_url",
                      image_url: {
                        url: location
                      }
                    }
                  ]
                }
              ],
              max_tokens: 60
            })
          });

          console.log("🔍 GPT raw response:", chatRes.text);
          const gpt = JSON.parse(chatRes.text);
          altText = gpt.choices?.[0]?.message?.content?.trim() || altText;
        } catch (err) {
          console.warn(`⚠️ GPT fallback alt text used for ${filename}`);
          console.error("GPT-4 Vision error:", err);
        }
      }

      const replacement = `![${altText}](${location})`;
      const markdownLink = `![[${filename}]]`;
      content = content.split(markdownLink).join(replacement);

      if (deleteAfterUpload) {
        await app.vault.delete(file);
        console.log(`🗑️ Deleted local file: ${filename}`);
      }

    } catch (err) {
      console.error(`❌ Upload error for ${filename}:`, err);
    }
  }

  editor.setValue(content);
  new Notice("✅ Image upload and replacement complete.");
}
