import { GoogleGenAI, Type } from "@google/genai";

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export interface DetectedObject {
    name: string;
    icon: string;
}
export interface AnalysisResponse {
    title: string;
    summary: string;
    detected_objects: DetectedObject[];
    color_palette: string[];
}


export interface TextExtractionResponse {
    text: string;
}

export interface PromptSuggestionsResponse {
    suggestions: string[];
}

const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result.split(',')[1]);
      }
    };
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
};

const analysisSchema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING, description: 'A short, creative title for the image analysis. e.g., "Whispers of the Past"' },
        summary: { type: Type.STRING, description: 'A one or two-sentence summary describing the image, focusing on the mood and subject.' },
        detected_objects: {
            type: Type.ARRAY,
            description: 'A list of 3-5 primary objects or subjects detected in the image.',
            items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING, description: 'The name of the detected object (e.g., "Person", "Antique Book").' },
                    icon: { type: Type.STRING, description: 'A simple keyword for an icon representing the object. Choose from: Person, Dress, Hat, Book, Lisp, Building, Nature, Animal, Vehicle, Other.' }
                },
                required: ['name', 'icon']
            }
        },
        color_palette: {
            type: Type.ARRAY,
            description: 'An array of 5 dominant HEX color codes from the image.',
            items: {
                type: Type.STRING,
                description: 'A color in HEX format (e.g., "#FFFFFF").'
            }
        }
    },
    required: ['title', 'summary', 'detected_objects', 'color_palette']
};

const suggestionsSchema = {
    type: Type.OBJECT,
    properties: {
        suggestions: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'A list of 3-4 concise and insightful questions a user might ask about the image.'
        }
    },
    required: ['suggestions']
};


export const analyzeImage = async (imageFile: File, prompt: string): Promise<AnalysisResponse> => {
    try {
        const imagePart = await fileToGenerativePart(imageFile);
        const textPart = { text: prompt };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, textPart] },
            config: {
                responseMimeType: "application/json",
                responseSchema: analysisSchema,
            },
        });
        
        const rawText = response.text;
        if (!rawText) {
            throw new Error("Failed to analyze image. The AI returned an empty response.");
        }
        const jsonString = rawText.trim();
        const cleanedJsonString = jsonString.replace(/^```json\n?/, '').replace(/\n?```$/, '');
        return JSON.parse(cleanedJsonString);

    } catch (error) {
        console.error("Error analyzing image with Gemini API:", error);
        throw new Error("Failed to analyze image. The AI may not have been able to provide a structured response.");
    }
};

export const extractTextFromImage = async (imageFile: File): Promise<TextExtractionResponse> => {
    try {
        const imagePart = await fileToGenerativePart(imageFile);
        const extractPrompt = "Extract all visible text from the image. Pay close attention to text that is rotated, skewed, or in a non-standard layout. The text may be in any language. Preserve line breaks and paragraph structure as seen in the image. Return only the extracted text as a single string.";

        const textPart = { text: extractPrompt };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, textPart] },
        });

        return { text: response.text ?? '' };
    } catch (error) {
        console.error("Error extracting text with Gemini API:", error);
        throw new Error("Failed to extract text from the image.");
    }
};

export const getPromptSuggestions = async (imageFile: File): Promise<PromptSuggestionsResponse> => {
    try {
        const imagePart = await fileToGenerativePart(imageFile);
        const systemInstruction = "You are an expert image analyst. Your task is to generate a few thought-provoking questions about the provided image to help guide the user's exploration. The questions should be concise and relevant to the image's content.";

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart] },
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: suggestionsSchema,
            },
        });

        const rawText = response.text;
        if (!rawText) {
            throw new Error("Failed to generate prompt suggestions. The AI returned an empty response.");
        }
        const jsonString = rawText.trim();
        const cleanedJsonString = jsonString.replace(/^```json\n?/, '').replace(/\n?```$/, '');
        return JSON.parse(cleanedJsonString);

    } catch (error) {
        console.error("Error getting prompt suggestions from Gemini API:", error);
        throw new Error("Failed to generate prompt suggestions.");
    }
};