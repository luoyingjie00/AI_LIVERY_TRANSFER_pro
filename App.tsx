
import React, { useState, useCallback } from 'react';
import ImageUploader from './components/ImageUploader';
import Terminal from './components/Terminal';
import ImageCompare from './components/ImageCompare';
import { Wand2Icon, DownloadIcon, RefreshCwIcon, MessageSquareIcon, HistoryIcon, KeyIcon } from './components/Icons';
import { ImageState, GenerationStatus, LogEntry, LogType, ResultHistoryItem } from './types';
import { fileToBase64 } from './utils/imageUtils';
import { generateLiveryTransfer } from './services/geminiService';

interface FeedbackItem {
  id: string;
  text: string;
  timestamp: Date;
}

const App: React.FC = () => {
  const [apiKey, setApiKey] = useState("");
  const [refImage, setRefImage] = useState<ImageState>({ file: null, previewUrl: null, base64: null, mimeType: '' });
  const [targetImage, setTargetImage] = useState<ImageState>({ file: null, previewUrl: null, base64: null, mimeType: '' });
  const [adaptationLevel, setAdaptationLevel] = useState<number>(50);
  const [status, setStatus] = useState<GenerationStatus>(GenerationStatus.IDLE);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  
  const [feedbackInput, setFeedbackInput] = useState("");
  const [feedbackHistory, setFeedbackHistory] = useState<FeedbackItem[]>([]);
  const [activeInstruction, setActiveInstruction] = useState<string>("");

  const [logs, setLogs] = useState<LogEntry[]>([]);
  
  // History State
  const [history, setHistory] = useState<ResultHistoryItem[]>([]);

  const addLog = (message: string, type: LogType = 'info') => {
    setLogs(prev => [...prev, {
      id: Math.random().toString(36).substring(7),
      timestamp: new Date(),
      type,
      message
    }]);
  };

  const handleRefImageSelect = useCallback(async (file: File) => {
    try {
      const base64 = await fileToBase64(file);
      const previewUrl = URL.createObjectURL(file);
      setRefImage({ file, previewUrl, base64, mimeType: file.type });
      addLog(`参考源已加载: ${file.name}`, 'info');
    } catch (e) {
      addLog(`加载失败: 参考图像异常`, 'error');
    }
  }, []);

  const handleTargetImageSelect = useCallback(async (file: File) => {
    try {
      const base64 = await fileToBase64(file);
      const previewUrl = URL.createObjectURL(file);
      setTargetImage({ file, previewUrl, base64, mimeType: file.type });
      addLog(`目标体已加载: ${file.name}`, 'info');
    } catch (e) {
      addLog(`加载失败: 目标图像异常`, 'error');
    }
  }, []);

  const handleGenerate = async () => {
    if (!refImage.base64 || !targetImage.base64) {
      addLog("错误: 缺少必要输入源", 'warning');
      return;
    }

    let instructionToUse = feedbackInput.trim() ? feedbackInput.trim() : activeInstruction;
    if (feedbackInput.trim()) {
      setActiveInstruction(instructionToUse);
      const lastHistory = feedbackHistory[0];
      if (!lastHistory || lastHistory.text !== instructionToUse) {
        setFeedbackHistory(prev => [{
          id: Math.random().toString(36).substring(7),
          text: instructionToUse,
          timestamp: new Date()
        }, ...prev]);
      }
    }

    setLogs([]);
    setStatus(GenerationStatus.LOADING);
    addLog("初始化会话进程...", 'info');
    addLog(`参数配置: 自适应阈值 ${adaptationLevel}%`, 'info');
    
    // Start Progress Simulation
    setProgress(0);
    const startTime = Date.now();
    const progressTimer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      // Rapidly go to 30%, then medium to 70%, then slow crawl to 95%
      setProgress(prev => {
        let increment = 0;
        if (prev < 30) increment = 2;
        else if (prev < 70) increment = 0.5;
        else if (prev < 95) increment = 0.1;
        
        return Math.min(95, prev + increment);
      });
    }, 100);

    try {
      if (!apiKey && !process.env.API_KEY) {
        throw new Error("错误: 需要 API 密钥");
      }

      addLog("资产编码中...", 'info');
      addLog("连接至 GEMINI 2.5 神经节点...", 'info');
      
      const result = await generateLiveryTransfer({
        apiKey: apiKey,
        referenceBase64: refImage.base64,
        referenceMimeType: refImage.mimeType,
        targetBase64: targetImage.base64,
        targetMimeType: targetImage.mimeType,
        adaptationLevel,
        feedback: instructionToUse
      });

      addLog("收到响应数据包", 'success');
      
      // Finish Progress
      clearInterval(progressTimer);
      setProgress(100);

      setResultImage(result);
      setStatus(GenerationStatus.SUCCESS);
      addLog("渲染管线执行完毕", 'success');

      // Add to history
      const newHistoryItem: ResultHistoryItem = {
        id: Date.now().toString(),
        timestamp: new Date(),
        resultImage: result,
        targetImagePreview: targetImage.previewUrl || "" // Save current target for comparison
      };
      setHistory(prev => [newHistoryItem, ...prev]);
      
    } catch (error: any) {
      clearInterval(progressTimer);
      setStatus(GenerationStatus.ERROR);
      addLog(`异常中止: ${error.message || "未知错误"}`, 'error');
    }
  };

  const handleRestoreHistory = (item: ResultHistoryItem) => {
    setResultImage(item.resultImage);
    // We need to update the target image state so the comparison component works correctly
    // We don't have the original File object anymore, but we have the preview URL (or base64 if we stored it)
    // Assuming previewUrl is valid or a base64 data string.
    setTargetImage(prev => ({
      ...prev,
      previewUrl: item.targetImagePreview,
      // Note: We effectively "lose" the base64 for re-generation unless we stored it in history too.
      // But for viewing, this is sufficient.
      base64: prev.base64 // Keep existing if possible, or it might mismatch. Ideally history stores base64 too for full restore.
    }));
    addLog(`已加载历史存档: ${item.id}`, 'info');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Helper text for status
  const getStatusText = () => {
    if (status === GenerationStatus.IDLE) return "等待任务 / AWAITING TASK";
    if (status === GenerationStatus.LOADING) {
      if (progress < 30) return "初始化神经节点 / INITIALIZING...";
      if (progress < 60) return "正在生成表面纹理 / GENERATING TEXTURE...";
      if (progress < 90) return "应用几何形变 / APPLYING GEOMETRY...";
      return "最终渲染处理 / FINALIZING...";
    }
    if (status === GenerationStatus.SUCCESS) return "任务完成 / TASK COMPLETE";
    if (status === GenerationStatus.ERROR) return "任务失败 / TASK FAILED";
    return "未知状态 / UNKNOWN";
  };

  return (
    <div className="min-h-screen relative overflow-x-hidden font-mono text-white selection:bg-blue-500 selection:text-white">
      
      {/* === BACKGROUND DECORATIONS LAYER === */}
      <div className="fixed inset-0 z-0 pointer-events-none select-none">
         {/* Top Left Decor */}
         <div className="absolute top-8 left-8 flex flex-col gap-1 opacity-30 hidden lg:flex">
            <div className="w-2 h-2 bg-white mb-2"></div>
            <span className="text-[9px] tracking-widest text-neutral-500">SYS.STATUS.ONLINE</span>
            <span className="text-[9px] tracking-widest text-neutral-500">LATENCY: 12ms</span>
         </div>

         {/* Top Right Decor */}
         <div className="absolute top-8 right-8 flex flex-col items-end gap-1 opacity-30 hidden lg:flex">
            <span className="text-[9px] tracking-widest text-neutral-500">SECURE_CONNECTION</span>
            <div className="flex gap-1 mt-1">
              <div className="w-1 h-1 bg-blue-500"></div>
              <div className="w-1 h-1 bg-neutral-700"></div>
              <div className="w-1 h-1 bg-neutral-700"></div>
            </div>
         </div>

         {/* Center Watermark */}
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[15vw] font-bold text-white opacity-[0.02] pointer-events-none whitespace-nowrap blur-sm tracking-widest z-[-1]">
            SYSTEM_V2
         </div>

         {/* Random Grid Markers */}
         <div className="absolute top-[20%] left-[10%] text-neutral-700 opacity-20">+</div>
         <div className="absolute top-[20%] right-[10%] text-neutral-700 opacity-20">+</div>
         <div className="absolute bottom-[20%] left-[10%] text-neutral-700 opacity-20">+</div>
         <div className="absolute bottom-[20%] right-[10%] text-neutral-700 opacity-20">+</div>
         
         {/* Vertical Guide Lines */}
         <div className="absolute top-0 bottom-0 left-[33.33%] w-px bg-gradient-to-b from-transparent via-neutral-800 to-transparent opacity-30 hidden lg:block"></div>
         <div className="absolute top-0 bottom-0 right-[33.33%] w-px bg-gradient-to-b from-transparent via-neutral-800 to-transparent opacity-30 hidden lg:block"></div>

         {/* Bottom Status */}
         <div className="absolute bottom-4 left-8 opacity-30 text-[9px] text-neutral-500 hidden lg:block">
            <span className="mr-4">MEM_ALLOC: 1024MB</span>
            <span className="mr-4">RENDER_CORE: ACTIVE</span>
         </div>
         <div className="absolute bottom-4 right-8 opacity-30 text-[9px] text-neutral-500 hidden lg:block">
            ID: 8472-9210-AE
         </div>
      </div>

      {/* === MAIN APP CONTENT === */}
      <div className="relative z-10 p-4 lg:p-8 max-w-[1600px] mx-auto flex flex-col gap-6 min-h-screen">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white flex items-center gap-2">
              <div className="w-3 h-8 bg-blue-600 mr-2"></div>
              LIVERY_TRANSFER<span className="text-blue-600">.PRO</span>
            </h1>
            <p className="text-sm text-neutral-500 tracking-wide mt-1 ml-5">AI 智能表面重构系统 v2.5</p>
          </div>
          
          <div className="flex items-center gap-3 bg-neutral-900/80 backdrop-blur rounded-full p-1 pr-4 border border-neutral-800 shadow-sm">
            <div className="bg-neutral-800 text-white p-2 rounded-full">
              <KeyIcon className="w-4 h-4" />
            </div>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="GEMINI API 密钥"
              className="bg-transparent border-none focus:ring-0 text-sm w-32 md:w-48 placeholder:text-neutral-600 text-white"
            />
          </div>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
          
          {/* LEFT COLUMN: CONTROLS */}
          <div className="lg:col-span-4 flex flex-col gap-6 h-full">
            
            {/* INPUT CARD */}
            <div className="tech-border-wrap shrink-0">
              <div className="tech-content p-6 flex flex-col gap-6">
                {/* Tab Header */}
                <div className="absolute top-0 left-0 w-full h-[60px] pointer-events-none">
                   <div className="absolute top-[18px] left-[70px] text-xl font-bold text-white tracking-tighter">01. 数据源 / INPUT</div>
                   <div className="absolute top-[25px] right-6 text-[10px] text-neutral-500 bg-neutral-900/50 px-2 py-1 border border-neutral-800 rounded">ASSET UPLOAD</div>
                </div>
                
                <div className="mt-10 grid grid-cols-2 gap-4">
                  <ImageUploader 
                    id="ref"
                    subLabel="参考源 / REF"
                    label="纹理图案"
                    description="STYLE / GRAPHIC"
                    previewUrl={refImage.previewUrl}
                    onImageSelect={handleRefImageSelect}
                  />
                  <ImageUploader 
                    id="target"
                    subLabel="目标体 / TARGET"
                    label="产品模型"
                    description="GEOMETRY / SHAPE"
                    previewUrl={targetImage.previewUrl}
                    onImageSelect={handleTargetImageSelect}
                  />
                </div>
              </div>
            </div>

            {/* SETTINGS CARD - NOW FLEXIBLE */}
            <div className="tech-border-wrap flex-1 flex flex-col">
              <div className="tech-content p-6 flex flex-col h-full">
                 {/* Tab Header */}
                <div className="absolute top-0 left-0 w-full h-[60px] pointer-events-none">
                   <div className="absolute top-[18px] left-[70px] text-xl font-bold text-white tracking-tighter">02. 参数控制 / CTRL</div>
                   <div className="absolute top-[25px] right-6 text-[10px] text-neutral-500 bg-neutral-900/50 px-2 py-1 border border-neutral-800 rounded">PARAMETERS</div>
                </div>

                {/* Content Container */}
                <div className="mt-10 flex flex-col flex-1 min-h-0">
                    
                    {/* Slider - Fixed */}
                    <div className="mb-6 shrink-0">
                      <div className="flex justify-between items-center mb-4">
                        <label className="text-xs font-bold text-neutral-400 uppercase">自适应阈值 / LEVEL</label>
                        <span className="text-xl font-bold text-white bg-neutral-800 px-2 py-0.5 rounded">{adaptationLevel}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={adaptationLevel}
                        onChange={(e) => setAdaptationLevel(parseInt(e.target.value))}
                        className="w-full h-4 bg-neutral-800 rounded-full appearance-none cursor-pointer accent-white hover:accent-blue-400 transition-all border border-neutral-700"
                      />
                      <div className="flex justify-between mt-2 text-[10px] text-neutral-500 uppercase font-bold">
                        <span>严格 / STRICT</span>
                        <span>平衡 / BALANCED</span>
                        <span>创意 / CREATIVE</span>
                      </div>
                    </div>

                    {/* Feedback & History - Flexible */}
                    <div className="flex-1 flex flex-col min-h-0 mb-4">
                      <div className="shrink-0 space-y-3">
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-bold text-neutral-400 uppercase flex items-center gap-2">
                            <MessageSquareIcon className="w-3 h-3" />
                            指令重写 / PROMPT OVERRIDE
                          </label>
                        </div>
                        <textarea
                          value={feedbackInput}
                          onChange={(e) => setFeedbackInput(e.target.value)}
                          placeholder="输入具体调整指令 (例如: '放大 Logo', '改为磨砂材质')..."
                          className="w-full h-24 bg-black/30 border border-neutral-700 rounded-lg p-3 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-blue-500 focus:bg-black/50 transition-all resize-none"
                        />
                      </div>

                      {/* History Log - Expands */}
                      {feedbackHistory.length > 0 && (
                        <div className="mt-4 flex-1 flex flex-col min-h-0 border-t border-neutral-800 pt-3">
                          <div className="flex items-center gap-2 mb-2 shrink-0">
                            <HistoryIcon className="w-3 h-3 text-neutral-500" />
                            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">操作日志 / OPERATION LOG</span>
                          </div>
                          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-2">
                            {feedbackHistory.map((item) => (
                              <div 
                                key={item.id} 
                                onClick={() => setFeedbackInput(item.text)}
                                className="group flex flex-col p-2 rounded border border-neutral-800/50 bg-neutral-900/30 hover:bg-neutral-800 cursor-pointer transition-all shrink-0"
                              >
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-[9px] text-neutral-600 font-mono">[{item.timestamp.toLocaleTimeString([], {hour12: false})}]</span>
                                  <span className="text-[9px] text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity font-bold">LOAD >></span>
                                </div>
                                <div className="text-[11px] text-neutral-400 font-mono group-hover:text-white break-words leading-relaxed">
                                  {item.text}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* ACTION BUTTON */}
                    <button
                      onClick={handleGenerate}
                      disabled={status === GenerationStatus.LOADING || !refImage.base64 || !targetImage.base64}
                      className={`
                        w-full py-6 rounded-xl font-bold text-xl tracking-wide transition-all duration-300 flex items-center justify-center gap-3 border relative overflow-hidden group shrink-0 mt-auto
                        ${status === GenerationStatus.LOADING 
                          ? 'bg-neutral-800 border-neutral-700 text-neutral-500 cursor-not-allowed' 
                          : 'bg-white border-white text-black hover:bg-blue-600 hover:border-blue-600 hover:text-white shadow-[0_0_20px_rgba(255,255,255,0.1)]'
                        }
                      `}
                    >
                      {status === GenerationStatus.LOADING ? (
                        <>
                          <RefreshCwIcon className="w-6 h-6 animate-spin" />
                          运算中 / PROCESSING...
                        </>
                      ) : (
                        <>
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
                          <Wand2Icon className="w-6 h-6" />
                          执行程序 / EXECUTE
                        </>
                      )}
                    </button>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: OUTPUT & TERMINAL */}
          <div className="lg:col-span-8 flex flex-col gap-6 h-full">
            
            {/* OUTPUT CARD */}
            <div className="tech-border-wrap blue-theme flex-1 flex flex-col min-h-[500px]">
               <div className="tech-content p-1 flex flex-col relative overflow-hidden">
                  
                   {/* Tab Header */}
                  <div className="absolute top-0 left-0 w-full h-[60px] pointer-events-none z-20">
                     <div className="absolute top-[18px] left-[70px] text-xl font-bold text-white tracking-tighter">03. 结果输出 / RESULT</div>
                     <div className="absolute top-[25px] right-6 text-[10px] text-blue-200 bg-blue-800/50 px-2 py-1 border border-blue-400/30 rounded">VISUALIZATION</div>
                  </div>
                  
                  {/* Main Content Area */}
                  <div className="flex-1 mt-[60px] mx-1 mb-1 rounded-br-[1.2rem] rounded-bl-[1.2rem] overflow-hidden bg-black/10 relative">
                    {resultImage && targetImage.previewUrl ? (
                      <ImageCompare 
                        beforeImage={targetImage.previewUrl}
                        afterImage={resultImage}
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center p-8 opacity-40">
                          <h3 className="text-5xl md:text-8xl font-bold text-white mb-4 tracking-tighter">NULL</h3>
                          <p className="text-sm text-blue-100 uppercase tracking-widest border-t border-white/20 pt-4 inline-block">等待系统输入 / WAITING FOR INPUT</p>
                        </div>
                        {/* Placeholder grid lines */}
                        <div className="absolute inset-0 pointer-events-none opacity-10" 
                           style={{backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px'}}>
                        </div>
                      </div>
                    )}
                  </div>

                  {resultImage && (
                    <div className="absolute bottom-6 right-6 z-30">
                      <a 
                        href={resultImage} 
                        download="generated_livery.png"
                        className="bg-white text-blue-700 hover:bg-blue-50 px-6 py-3 rounded-lg font-bold flex items-center gap-2 shadow-xl transition-all uppercase tracking-wider"
                      >
                        <DownloadIcon className="w-4 h-4" />
                        导出资产 / EXPORT
                      </a>
                    </div>
                  )}
               </div>
            </div>

            {/* TERMINAL CARD - Fixed Height */}
            <div className="tech-border-wrap">
              <div className="tech-content p-4 flex flex-col h-64">
                 {/* Tab Header */}
                 <div className="absolute top-0 left-0 w-full h-[60px] pointer-events-none z-10">
                   <div className="absolute top-[18px] left-[70px] text-xl font-bold text-white tracking-tighter">系统日志 / SYSTEM.LOG</div>
                </div>
                <div className="mt-10 flex-1 overflow-hidden relative z-0">
                  <Terminal logs={logs} progress={progress} statusText={getStatusText()} />
                </div>
              </div>
            </div>

          </div>
          
          {/* BOTTOM: HISTORY ARCHIVE (NEW SECTION) */}
          <div className="col-span-1 lg:col-span-12">
             <div className="tech-border-wrap">
               <div className="tech-content p-6 pb-8">
                  {/* Header */}
                  <div className="absolute top-0 left-0 w-full h-[60px] pointer-events-none">
                      <div className="absolute top-[18px] left-[70px] text-xl font-bold text-white tracking-tighter">04. 历史档案 / ARCHIVES</div>
                      <div className="absolute top-[25px] right-6 text-[10px] text-neutral-500 bg-neutral-900/50 px-2 py-1 border border-neutral-800 rounded">{history.length} RECORDS</div>
                  </div>
                  
                  <div className="mt-12 flex gap-4 overflow-x-auto pb-4 custom-scrollbar min-h-[160px]">
                    {history.length === 0 ? (
                       <div className="w-full flex flex-col items-center justify-center text-neutral-600 py-8 border border-dashed border-neutral-800 rounded-xl">
                          <HistoryIcon className="w-6 h-6 mb-2 opacity-50" />
                          <span className="text-xs font-bold uppercase tracking-widest">NO ARCHIVES FOUND</span>
                       </div>
                    ) : (
                      history.map((item) => (
                        <div 
                          key={item.id}
                          onClick={() => handleRestoreHistory(item)}
                          className="group relative flex-shrink-0 w-48 h-32 bg-neutral-900 rounded-lg border border-neutral-800 overflow-hidden cursor-pointer hover:border-blue-500 transition-all hover:shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                        >
                           <img src={item.resultImage} alt="archive" className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" />
                           <div className="absolute bottom-0 left-0 w-full bg-black/80 p-2 backdrop-blur-sm border-t border-white/10">
                              <div className="text-[9px] text-neutral-400 font-mono font-bold">{item.timestamp.toLocaleTimeString([], {hour12: false})}</div>
                              <div className="text-[9px] text-blue-400 font-bold mt-0.5">ID: {item.id.substring(0,6)}</div>
                           </div>
                           {/* Tech corners */}
                           <div className="absolute top-1 left-1 w-2 h-2 border-l border-t border-white/30"></div>
                           <div className="absolute top-1 right-1 w-2 h-2 border-r border-t border-white/30"></div>
                        </div>
                      ))
                    )}
                  </div>
               </div>
             </div>
          </div>

        </main>
      </div>
    </div>
  );
};

export default App;
