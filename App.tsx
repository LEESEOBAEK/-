import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { analyzeImage, extractTextFromImage, getPromptSuggestions, AnalysisResponse, TextExtractionResponse, DetectedObject } from './services/geminiService';
import { ImageIcon, SparklesIcon, TypeIcon, SendIcon, SettingsIcon, LightbulbIcon, ChevronDownIcon, ChevronUpIcon, PersonIcon, BookIcon, ClothingIcon, BuildingIcon, NatureIcon, OtherIcon } from './components/icons';

type AnalysisResultData = AnalysisResponse | null;
type TextResultData = TextExtractionResponse | null;
type AppState = 'idle' | 'loading' | 'interactive';

// === THEME CONFIGURATION OBJECT ===
const themeConfig = {
    title: "AI Vision Toolkit",
    uploader: {
        title: "Upload an Image to Begin",
        description: "Drag & drop, click, or paste an image.",
    },
    loadingMessage: "Analyzing...",
    promptPlaceholder: "Ask anything about the image...",
    buttons: {
        analyze: "Analyze",
    },
    results: {
        analysisTitle: "Pose Skeleton",
        objectsTitle: "Detected Objects",
        paletteTitle: "Color Palette",
        textTitle: "Segmentation Overlay",
    }
};

const iconMap: { [key: string]: React.FC<{ className?: string }> } = {
    Person: PersonIcon,
    Book: BookIcon,
    Dress: ClothingIcon,
    Hat: ClothingIcon,
    Lisp: OtherIcon,
    Building: BuildingIcon,
    Nature: NatureIcon,
    Other: OtherIcon,
};


const LoadingState: React.FC = () => (
    <div className="flex flex-col items-center justify-center p-4">
        <div className="dot-pulse">
            <div/><div/><div/>
        </div>
        <p className="mt-4 text-sm text-secondary">{themeConfig.loadingMessage}</p>
    </div>
);

const Uploader: React.FC<{ onImageChange: (file: File) => void; }> = ({ onImageChange }) => {
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) onImageChange(file);
    };
    
    const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
        const file = event.clipboardData.files[0];
        if (file && file.type.startsWith('image/')) {
            onImageChange(file);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center p-4 h-full" onPaste={handlePaste}>
             <h1 className="text-4xl font-bold text-center text-gradient-accent-light mb-4">
                {themeConfig.title}
            </h1>
            <input type="file" id="imageUpload" accept="image/*" className="hidden" onChange={handleFileChange} />
            <label htmlFor="imageUpload" className="cursor-pointer w-full max-w-md h-64 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-theme hover:border-accent hover:bg-secondary transition-all duration-300 p-4">
                <ImageIcon className="w-12 h-12 mb-4 text-gray-500" />
                <span className="font-semibold text-accent-strong text-lg">{themeConfig.uploader.title}</span>
                <span className="text-md text-secondary mt-2">{themeConfig.uploader.description}</span>
            </label>
        </div>
    );
};

const AnalysisCard: React.FC<{ title: string; children: React.ReactNode; defaultOpen?: boolean }> = ({ title, children, defaultOpen = true }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="bg-secondary rounded-xl overflow-hidden">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center p-4">
                <h3 className="font-semibold text-accent-strong uppercase tracking-wider">{title}</h3>
                {isOpen ? <ChevronUpIcon className="w-5 h-5 text-secondary" /> : <ChevronDownIcon className="w-5 h-5 text-secondary" />}
            </button>
            {isOpen && <div className="p-4 pt-0 slide-up-fade-in">{children}</div>}
        </div>
    );
};


export default function App() {
    const [appState, setAppState] = useState<AppState>('idle');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [prompt, setPrompt] = useState<string>('Analyze this image');
    const [analysisResult, setAnalysisResult] = useState<AnalysisResultData>(null);
    const [textResult, setTextResult] = useState<TextResultData>(null);
    const [error, setError] = useState<string | null>(null);
    
    const imagePreviewUrl = useMemo(() => imageFile ? URL.createObjectURL(imageFile) : null, [imageFile]);

    useEffect(() => () => {
        if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    }, [imagePreviewUrl]);

    const handleImageChange = useCallback((file: File) => {
        setImageFile(file);
        setAnalysisResult(null);
        setTextResult(null);
        setError(null);
        setPrompt('Analyze this image');
        setAppState('interactive');
    }, []);
    
    const handleReset = () => {
        setImageFile(null);
        setAnalysisResult(null);
        setTextResult(null);
        setError(null);
        setAppState('idle');
    };

    const handleAnalyze = async () => {
        if (!imageFile) return;
        setError(null);
        setAnalysisResult(null);
        setTextResult(null);
        setAppState('loading');
        try {
            const [analysis, text] = await Promise.all([
                analyzeImage(imageFile, prompt),
                extractTextFromImage(imageFile)
            ]);
            setAnalysisResult(analysis);
            setTextResult(text);
        } catch (err: any) {
            setError(err.message || 'An unknown error occurred.');
        } finally {
            setAppState('interactive');
        }
    };

    return (
        <div className="min-h-screen font-sans transition-all duration-500 bg-primary text-primary">
            <main className="max-w-2xl mx-auto p-4 md:p-6 space-y-6">
                {!imageFile ? (
                    <Uploader onImageChange={handleImageChange} />
                ) : (
                    <>
                        <div className="bg-secondary rounded-xl p-4 space-y-4">
                             {imagePreviewUrl && <img src={imagePreviewUrl} alt="Preview" className="w-full rounded-lg object-contain" />}
                             <div className="flex items-center space-x-2">
                                <button onClick={handleAnalyze} className="w-full bg-accent text-on-accent font-bold py-3 px-4 rounded-lg hover:bg-accent-hover transition-colors disabled:bg-disabled disabled:text-disabled" disabled={appState === 'loading'}>
                                    {themeConfig.buttons.analyze}
                                </button>
                                 <button onClick={handleReset} className="text-secondary hover:text-accent-strong py-3 px-4 rounded-lg transition-colors text-sm">
                                    New
                                </button>
                             </div>
                             {appState === 'loading' && <LoadingState />}
                        </div>

                        {error && <div className="text-error bg-error p-4 rounded-lg fade-in">{error}</div>}

                        <div className="space-y-4">
                            {analysisResult && (
                                <>
                                    <AnalysisCard title={themeConfig.results.analysisTitle}>
                                        <div className="space-y-4">
                                            <h2 className="text-2xl font-bold text-gradient-accent-light">{analysisResult.title}</h2>
                                            <p className="text-secondary leading-relaxed">{analysisResult.summary}</p>
                                        </div>
                                    </AnalysisCard>
                                    
                                    <AnalysisCard title={themeConfig.results.objectsTitle}>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                            {analysisResult.detected_objects.map((obj, index) => {
                                                const IconComponent = iconMap[obj.icon] || OtherIcon;
                                                return (
                                                    <div key={index} className="bg-subtle/50 p-3 rounded-lg flex items-center space-x-3">
                                                        <IconComponent className="w-6 h-6 text-accent" />
                                                        <span className="text-accent-strong font-medium">{obj.name}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </AnalysisCard>

                                    <AnalysisCard title={themeConfig.results.paletteTitle}>
                                        <div className="flex flex-wrap gap-3">
                                            {analysisResult.color_palette.map((color, index) => (
                                                <div key={index} className="flex items-center space-x-2">
                                                    <div className="w-8 h-8 rounded-full border-2 border-white/20" style={{ backgroundColor: color }} />
                                                    <span className="text-secondary font-mono text-sm">{color}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </AnalysisCard>
                                </>
                            )}
                             {textResult && textResult.text.trim() && (
                                <AnalysisCard title={themeConfig.results.textTitle}>
                                     <div className="bg-subtle/50 p-4 rounded-lg max-h-60 overflow-y-auto">
                                        <p className="whitespace-pre-wrap leading-relaxed text-secondary">{textResult.text}</p>
                                    </div>
                                </AnalysisCard>
                             )}
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}
