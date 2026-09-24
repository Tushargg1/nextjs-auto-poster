'use client';

import { useState, useRef, useEffect, DragEvent } from 'react';
import { upload } from '@vercel/blob/client';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [platforms, setPlatforms] = useState({ youtube: true, facebook: true, instagram: false });
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/history');
      if (res.ok) {
        const data = await res.json();
        if (data.posts) setHistory(data.posts);
      }
    } catch (e) {
      console.error('Failed to fetch history', e);
    }
  };

  useEffect(() => {
    fetchHistory();
    const interval = setInterval(fetchHistory, 30000); // Auto-refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const handleFile = (selectedFile: File) => {
    if (selectedFile && selectedFile.type.startsWith('video/')) {
      setFile(selectedFile);
      if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
      setVideoPreviewUrl(URL.createObjectURL(selectedFile));
    } else {
      setStatus({ type: 'error', message: 'Please select a valid video file.' });
    }
  };

  const onDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => setIsDragging(false);

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handlePlatformChange = (platform: 'youtube' | 'facebook' | 'instagram') => {
    setPlatforms(prev => ({ ...prev, [platform]: !prev[platform] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return setStatus({ type: 'error', message: 'Please select a video file.' });
    if (!platforms.youtube && !platforms.facebook && !platforms.instagram) return setStatus({ type: 'error', message: 'Select at least one platform.' });
    if (!scheduleTime) return setStatus({ type: 'error', message: 'Please select a schedule time.' });

    setIsLoading(true);
    setStatus({ type: 'info', message: 'Uploading video securely to cloud...' });

    try {
      const blob = await upload(file.name, file, { access: 'public', handleUploadUrl: '/api/upload' });
      setStatus({ type: 'info', message: 'Video uploaded! Setting up the alarm clock...' });

      const scheduleRes = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoUrl: blob.url,
          blobName: file.name,
          description: description,
          platforms: Object.keys(platforms).filter((p) => platforms[p as keyof typeof platforms]),
          scheduleTime: scheduleTime,
        }),
      });

      const scheduleData = await scheduleRes.json();
      if (!scheduleRes.ok) throw new Error(scheduleData.error || 'Failed to schedule');

      setStatus({ type: 'success', message: 'Post successfully scheduled! 🎉' });
      
      // Reset form
      setFile(null);
      setVideoPreviewUrl(null);
      setDescription('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchHistory();
      
      // Clear success message after 5 seconds
      setTimeout(() => setStatus({ type: '', message: '' }), 5000);
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message || 'An error occurred' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async (messageId: string) => {
    if (!confirm('Are you sure you want to cancel this scheduled post?')) return;
    
    try {
      const res = await fetch('/api/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId }),
      });
      if (!res.ok) throw new Error('Failed to cancel');
      fetchHistory();
    } catch (err) {
      alert('Failed to cancel the post.');
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-6 lg:p-12 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center md:text-left md:flex md:items-center md:justify-between">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 flex items-center justify-center md:justify-start gap-3">
              <span className="bg-gradient-to-br from-indigo-500 to-purple-600 bg-clip-text text-transparent">Antigravity</span> Auto-Poster
            </h1>
            <p className="mt-2 text-lg text-slate-500">Schedule once, publish everywhere automatically.</p>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Form Column */}
          <div className="lg:col-span-5 bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100">
            <h2 className="text-2xl font-bold mb-6">Create Post</h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Drag and Drop Zone */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Video File</label>
                {!videoPreviewUrl ? (
                  <div 
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all ${
                      isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 hover:border-slate-400 bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    <svg className="w-10 h-10 text-slate-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-sm font-medium text-slate-600">Click or drag video to upload</p>
                    <p className="text-xs text-slate-400 mt-1">MP4 or Quicktime up to 100MB</p>
                  </div>
                ) : (
                  <div className="relative rounded-2xl overflow-hidden bg-black group">
                    <video src={videoPreviewUrl} controls className="w-full h-48 object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                    <button 
                      type="button" 
                      onClick={() => { setFile(null); setVideoPreviewUrl(null); }}
                      className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-2 hover:bg-red-500 transition-colors backdrop-blur-md"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                )}
                <input type="file" accept="video/mp4,video/quicktime" className="hidden" ref={fileInputRef} onChange={(e) => e.target.files && handleFile(e.target.files[0])} />
              </div>

              {/* Caption */}
              <div>
                <div className="flex justify-between items-end mb-2">
                  <label className="block text-sm font-semibold text-slate-700">Caption</label>
                  <span className="text-xs font-medium text-indigo-500 bg-indigo-50 px-2 py-1 rounded-full">AI Auto-Generate if empty</span>
                </div>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Write a viral caption or leave this blank to let the AI write it for you based on the video content..."
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-shadow resize-none"
                />
              </div>

              {/* Platforms */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3">Platforms to publish</label>
                <div className="grid grid-cols-3 gap-3">
                  {(['youtube', 'facebook', 'instagram'] as const).map(platform => (
                    <label key={platform} className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-all ${platforms[platform] ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-100 hover:border-slate-200 bg-white'}`}>
                      <input type="checkbox" checked={platforms[platform]} onChange={() => handlePlatformChange(platform)} className="hidden" />
                      <span className={`text-sm font-semibold capitalize ${platforms[platform] ? 'text-indigo-700' : 'text-slate-600'}`}>{platform}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Time */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Publish Time (Local Time)</label>
                <input 
                  type="datetime-local" 
                  required
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-shadow"
                />
              </div>

              {status.message && (
                <div className={`p-4 rounded-xl text-sm font-medium ${
                  status.type === 'error' ? 'bg-red-50 text-red-800 border border-red-100' : 
                  status.type === 'success' ? 'bg-green-50 text-green-800 border border-green-100' : 
                  'bg-blue-50 text-blue-800 border border-blue-100'
                }`}>
                  {status.message}
                </div>
              )}

              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full py-4 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 transition-all font-bold shadow-lg shadow-indigo-200 flex justify-center items-center gap-2"
              >
                {isLoading ? (
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                )}
                {isLoading ? 'Processing...' : 'Schedule Automation'}
              </button>
            </form>
          </div>

          {/* History Column */}
          <div className="lg:col-span-7 bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-slate-900">Automation History</h3>
                <button onClick={fetchHistory} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                </button>
             </div>
             
             <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
               {history.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4 py-12">
                    <svg className="w-16 h-16 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                    <p className="font-medium">No posts scheduled yet.</p>
                  </div>
               ) : (
                  <div className="space-y-4">
                     {history.map((post) => {
                        const isPending = post.status === 'PENDING';
                        const isCancelled = post.status === 'CANCELLED';
                        const isIgProcessing = post.status === 'IG_PROCESSING';
                        
                        return (
                          <div key={post.id} className="group flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                            <div className="flex flex-col mb-3 sm:mb-0">
                              <span className="font-bold text-slate-800 text-lg truncate max-w-[200px] sm:max-w-xs" title={post.blobName}>{post.blobName}</span>
                              <span className="text-sm text-slate-500 mt-1 flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                {new Date(post.scheduleTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                              </span>
                              <div className="flex gap-2 mt-2">
                                {post.platforms?.map((p: string) => (
                                  <span key={p} className="text-xs font-semibold uppercase tracking-wider text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded-md shadow-sm">
                                    {p}
                                  </span>
                                ))}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                              <span className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest shadow-sm ${
                                post.status === 'POSTED' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                                isPending ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                                isIgProcessing ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                                'bg-slate-200 text-slate-500 border border-slate-300'
                              }`}>
                                {isIgProcessing ? 'Processing IG' : post.status}
                              </span>
                              
                              {isPending && (
                                <button 
                                  onClick={() => handleCancel(post.id)}
                                  className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-2 rounded-lg transition-colors border border-red-100 shadow-sm"
                                  title="Cancel Post"
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                              )}
                            </div>
                          </div>
                        )
                     })}
                  </div>
               )}
             </div>
          </div>
        </div>
      </div>
    </main>
  );
}
