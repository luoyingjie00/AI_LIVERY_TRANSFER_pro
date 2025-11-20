import { GoogleGenAI, Modality } from "@google/genai";

interface GenerateLiveryParams {
  apiKey?: string;
  referenceBase64: string;
  referenceMimeType: string;
  targetBase64: string;
  targetMimeType: string;
  adaptationLevel: number; // 0 to 100
  feedback?: string;
}

export const generateLiveryTransfer = async ({
  apiKey,
  referenceBase64,
  referenceMimeType,
  targetBase64,
  targetMimeType,
  adaptationLevel,
  feedback
}: GenerateLiveryParams): Promise<string> => {
  
  const finalApiKey = apiKey || process.env.API_KEY;

  if (!finalApiKey) {
    throw new Error("未找到 API Key。请在页面左上角输入您的 Gemini API Key，或配置环境变量。");
  }

  // Initialize the Gemini client with the dynamic key
  const ai = new GoogleGenAI({ apiKey: finalApiKey });
  
  // Constructing the prompt based on the slider value (adaptationLevel)
  let adherenceInstruction = "";
  
  if (adaptationLevel < 30) {
    adherenceInstruction = "STRICT ADHERENCE: Copy the pattern/graphics from the first image exactly as they appear. Minimally wrap them around the target object. Do not alter the artistic style.";
  } else if (adaptationLevel < 70) {
    adherenceInstruction = "BALANCED ADAPTATION: Apply the pattern/graphics from the first image onto the target object. Adjust the pattern placement intelligently to fit the product's main surfaces while keeping the core design recognizable.";
  } else {
    adherenceInstruction = "CREATIVE INTEGRATION: Take the visual theme and elements from the first image and creatively redesign the skin of the target object. You have freedom to warp, scale, and flow the graphics to perfectly accentuate the target product's 3D geometry and curves.";
  }

  let feedbackSection = "";
  if (feedback && feedback.trim().length > 0) {
    feedbackSection = `
    4. USER FEEDBACK / REFINEMENT:
    The user has provided specific feedback from a previous iteration. You MUST prioritize this instruction:
    "${feedback}"
    `;
  }

  const prompt = `
    You are an expert industrial designer specializing in CMF (Color, Material, Finish) and livery design.
    
    Input Image 1: REFERENCE STYLE. Contains the pattern, graphic design, or texture to be transferred.
    Input Image 2: TARGET PRODUCT. Contains the object (product, vehicle, or device) that needs to be re-skinned.

    TASK:
    Apply the surface design (livery/pattern) from Input Image 1 onto the object in Input Image 2.
    
    CRITICAL CONSTRAINTS:
    1. PRESERVE SHAPE: The geometry, perspective, lighting, and structural details of the object in Input Image 2 MUST remain exactly unchanged. Do not hallucinate new parts or change the viewing angle.
    2. APPLY TEXTURE: Replace the original surface material/color of the target object with the style from the reference image.
    3. ${adherenceInstruction}
    ${feedbackSection}
    
    Output a high-quality photorealistic image of the target product with the new design applied.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: referenceMimeType,
              data: referenceBase64
            }
          },
          {
            inlineData: {
              mimeType: targetMimeType,
              data: targetBase64
            }
          },
          {
            text: prompt
          }
        ]
      },
      config: {
        responseModalities: [Modality.IMAGE],
      }
    });

    // Extract image from response
    // As per guidelines for generateContent with IMAGE modality
    const parts = response.candidates?.[0]?.content?.parts;
    if (parts && parts.length > 0) {
      for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
           return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    
    throw new Error("生成响应中未包含图像数据。");

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};