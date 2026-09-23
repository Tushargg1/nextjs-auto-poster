'use client';

import { useState, useRef, useEffect } from 'react';
import { upload } from '@vercel/blob/client';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [platforms, setPlatforms] = useState({ youtube: true, facebook: true, instagram: false });
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
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
  }, []);

  const handlePlatformChange = (platform: 'youtube' | 'facebook' | 'instagram') => {
    setPlatforms(prev => ({ ...prev, [platform]: !prev[platform] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setStatus({ type: 'error', message: 'Please select a video file.' });
      return;
    }
    if (!platforms.youtube && !platforms.facebook && !platforms.instagram) {
      setStatus({ type: 'error', message: 'Please select at least one platform.' });
      return;
    }
    if (!scheduleTime) {
      setStatus({ type: 'error', message: 'Please select a schedule time.' });
      return;
    }

    setIsLoading(true);
    setStatus({ type: 'info', message: 'Uploading video to Vercel Blob (this may take a minute)...' });

    try {
      const blob = await upload(file.name, file, {
        access: 'public',
        handleUploadUrl: '/api/upload',
      });

      setStatus({ type: 'info', message: 'Video uploaded! Scheduling the post...' });

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

      setStatus({ type: 'success', message: 'Post successfully scheduled!' });
      
      setFile(null);
      setDescription('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      // Refresh history
      fetchHistory();
    } catch (err: any) {
      console.error(err);
      setStatus({ type: 'error', message: err.message || 'An error occurred' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center py-10 px-4 space-y-8">
      <div className="max-w-xl w-full bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
        <div className="text-center mb-8">
          <div className="mx-auto h-12 w-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900">AI Auto-Poster</h2>
          <p className="mt-2 text-sm text-slate-500">Serverless scheduling powered by Vercel & Upstash</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Video File (MP4)</label>
            <input 
              type="file" 
              accept="video/mp4,video/quicktime" 
              required
              ref={fileInputRef}
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Caption <span className="text-indigo-500 font-normal">(Optional - AI will generate if empty)</span>
            </label>
            <textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Leave blank to let AI do the magic!"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Platforms</label>
            <div className="flex gap-4">
              <label className="flex items-center space-x-2">
                <input type="checkbox" checked={platforms.youtube} onChange={() => handlePlatformChange('youtube')} className="rounded text-indigo-600" />
                <span className="text-sm font-medium text-slate-700">YouTube</span>
              </label>
              <label className="flex items-center space-x-2">
                <input type="checkbox" checked={platforms.facebook} onChange={() => handlePlatformChange('facebook')} className="rounded text-indigo-600" />
                <span className="text-sm font-medium text-slate-700">Facebook</span>
              </label>
              <label className="flex items-center space-x-2">
                <input type="checkbox" checked={platforms.instagram} onChange={() => handlePlatformChange('instagram')} className="rounded text-indigo-600" />
                <span className="text-sm font-medium text-slate-700">Instagram</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Publish Time (Local Time)</label>
            <input 
              type="datetime-local" 
              required
              value={scheduleTime}
              onChange={(e) => setScheduleTime(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full py-3 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors font-medium shadow-md"
          >
            {isLoading ? 'Processing...' : 'Schedule Post'}
          </button>
        </form>

        {status.message && (
          <div className={`mt-4 p-4 rounded-lg text-sm font-medium ${
            status.type === 'error' ? 'bg-red-50 text-red-800' : 
            status.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-blue-50 text-blue-800'
          }`}>
            {status.message}
          </div>
        )}
      </div>

      <div className="max-w-xl w-full bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
         <h3 className="text-xl font-bold text-slate-900 mb-4">Post History</h3>
         {history.length === 0 ? (
            <p className="text-sm text-slate-500">No posts scheduled yet.</p>
         ) : (
            <div className="overflow-x-auto">
               <table className="w-full text-sm text-left text-slate-500">
                  <thead className="text-xs text-slate-700 uppercase bg-slate-50">
                     <tr>
                        <th className="px-4 py-3">Video</th>
                        <th className="px-4 py-3">Platforms</th>
                        <th className="px-4 py-3">Time</th>
                        <th className="px-4 py-3">Status</th>
                     </tr>
                  </thead>
                  <tbody>
                     {history.map((post, i) => (
                        <tr key={i} className="border-b">
                           <td className="px-4 py-3 font-medium text-slate-900">{post.blobName}</td>
                           <td className="px-4 py-3 capitalize">{post.platforms?.join(', ')}</td>
                           <td className="px-4 py-3">{new Date(post.scheduleTime).toLocaleString()}</td>
                           <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                post.status === 'POSTED' ? 'bg-green-100 text-green-800' :
                                post.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-blue-100 text-blue-800'
                              }`}>
                                {post.status}
                              </span>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         )}
         <button onClick={fetchHistory} className="mt-4 text-sm text-indigo-600 hover:underline">
            Refresh History
         </button>
      </div>
    </main>
  );
}
