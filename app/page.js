'use client';

import React, { useState, useEffect } from 'react';
import { 
  Trophy, Medal, Flame, Shield, Activity, 
  Upload, MessageSquare, Zap, Star, ThumbsUp, Radio
} from 'lucide-react';

export default function VisitorPublicPage() {
  // البيانات الديناميكية
  const [leagueData, setLeagueData] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [userVote, setUserVote] = useState(null);

  // جلب البيانات المخزنة للدوري والتعليقات
  useEffect(() => {
    const savedLeague = localStorage.getItem('champions_league_data');
    if (savedLeague) {
      try {
        setLeagueData(JSON.parse(savedLeague));
      } catch (e) {
        console.error("خطأ في تحميل بيانات الدوري:", e);
      }
    }

    const savedComments = localStorage.getItem('champions_league_comments');
    if (savedComments) {
      try {
        setComments(JSON.parse(savedComments));
      } catch (e) {
        console.error("خطأ في تحميل التعليقات:", e);
      }
    }
  }, []);

  // معالجة رفع مقاطع الميديا وقراءتها كـ Base64 لتبقى محفوظة
  const handleMediaUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setMediaFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // إضافة تعليق أو لقطة ضربة جزاء
  const handleAddComment = (e) => {
    e.preventDefault();
    if (!newComment.trim() && !mediaPreview) return;

    const newEntry = {
      id: Date.now(),
      text: newComment,
      media: mediaPreview,
      mediaType: mediaFile?.type.startsWith('video') ? 'video' : 'image',
      time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      likes: 0
    };

    const updatedComments = [newEntry, ...comments];
    setComments(updatedComments);
    localStorage.setItem('champions_league_comments', JSON.stringify(updatedComments));
    
    // إعادة تعيين المدخلات
    setNewComment('');
    setMediaFile(null);
    setMediaPreview(null);
  };

  // إعجاب بالتعليق
  const handleLike = (id) => {
    const updated = comments.map(c => c.id === id ? { ...c, likes: c.likes + 1 } : c);
    setComments(updated);
    localStorage.setItem('champions_league_comments', JSON.stringify(updated));
  };

  // بيانات افتراضية في حال عدم وجود بيانات مخزنة بعد
  const teams = leagueData?.teams || [
    { name: 'فريق الأبطال', played: 3, points: 9, goals: 8 },
    { name: 'فريق النجوم', played: 3, points: 6, goals: 5 },
    { name: 'فريق التحدي', played: 3, points: 3, goals: 3 },
  ];

  const topScorer = leagueData?.topScorer || { name: 'اللاعب المبدع', goals: 5, team: 'فريق الأبطال' };
  const featuredMatch = leagueData?.lastMatch || { teamA: 'فريق الأبطال', scoreA: 3, scoreB: 2, teamB: 'فريق النجوم' };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans dir-rtl">
      
      {/* شريط الأنباء والبث المباشر */}
      <div className="bg-amber-500 text-slate-950 font-bold text-xs py-2 px-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 animate-pulse text-red-700" />
          <span>تغطية حية: متابعة نتائج مباريات دوري الأبطال واللقطات المباشرة</span>
        </div>
        <span className="hidden md:inline bg-slate-950 text-amber-400 px-2 py-0.5 rounded text-[10px]">
          شاشة الزوار
        </span>
      </div>

      {/* Header السينمائي */}
      <header className="relative overflow-hidden bg-gradient-to-r from-blue-950 via-indigo-950 to-slate-950 border-b border-indigo-500/20 py-8 px-6 shadow-2xl">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-gradient-to-br from-amber-400 to-yellow-600 rounded-2xl shadow-lg shadow-yellow-500/20">
              <Trophy className="w-10 h-10 text-slate-950" />
            </div>
            <div>
              <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-yellow-300 via-amber-200 to-white">
                دوري الأبطال
              </h1>
              <p className="text-indigo-300 text-xs md:text-sm mt-1 flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400 animate-spin" />
                عرض النتائج، الإحصائيات، ولقطات ضربات الجزاء
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-xl border border-indigo-500/30">
            <Shield className="w-4 h-4 text-indigo-400" />
            <span className="text-xs text-slate-300">وضع القراءة والتفاعل للجمهور</span>
          </div>
        </div>
      </header>

      {/* المحتوى الرئيسي */}
      <main className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* القسم الأيمن: النتائج والتعليقات */}
        <section className="lg:col-span-2 space-y-8">
          
          {/* شاشة المباراة الأخيرة */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/60 rounded-3xl p-6 border border-amber-500/30 shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                <Zap className="w-4 h-4 fill-amber-400" /> أبرز مباراة
              </span>
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-full border border-emerald-500/30">
                انتهت
              </span>
            </div>

            {/* Scoreboard */}
            <div className="grid grid-cols-3 items-center text-center py-6 bg-slate-950/60 rounded-2xl border border-slate-800">
              <div className="space-y-2">
                <div className="w-14 h-14 mx-auto bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-full flex items-center justify-center text-lg font-bold shadow-lg">
                  {featuredMatch.teamA[0]}
                </div>
                <h3 className="font-bold text-sm md:text-base text-slate-100">{featuredMatch.teamA}</h3>
              </div>

              <div className="space-y-1">
                <div className="text-3xl md:text-5xl font-black tracking-widest text-amber-400 font-mono">
                  {featuredMatch.scoreA} - {featuredMatch.scoreB}
                </div>
                <span className="text-[10px] text-slate-400">النتيجة النهائية</span>
              </div>

              <div className="space-y-2">
                <div className="w-14 h-14 mx-auto bg-gradient-to-tr from-red-600 to-rose-500 rounded-full flex items-center justify-center text-lg font-bold shadow-lg">
                  {featuredMatch.teamB[0]}
                </div>
                <h3 className="font-bold text-sm md:text-base text-slate-100">{featuredMatch.teamB}</h3>
              </div>
            </div>

            {/* تصويت رجل المباراة */}
            <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
              <span className="text-xs font-medium text-slate-300 flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" /> تصويت الأفضل في المباراة:
              </span>
              <div className="flex gap-2">
                {['صانع الألعاب', 'المهاجم', 'الحارس'].map((player, idx) => (
                  <button
                    key={idx}
                    onClick={() => setUserVote(player)}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                      userVote === player
                        ? 'bg-amber-400 text-slate-950 shadow-md scale-105'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {player}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* التعليقات ورفـع الفيديو/الصور */}
          <div className="bg-slate-900/90 rounded-3xl p-6 border border-slate-800 space-y-6">
            <h2 className="text-lg font-bold flex items-center gap-2 text-indigo-300">
              <MessageSquare className="w-5 h-5 text-amber-400" /> التعليقات ولقطات ضربات الجزاء
            </h2>

            <form onSubmit={handleAddComment} className="space-y-4 bg-slate-950/50 p-4 rounded-2xl border border-slate-800">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="اكتب تعليقك أو أرفق فيديو/صورة لضربة الجزاء..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs focus:outline-none focus:border-indigo-500 text-slate-200 resize-none h-20"
              />

              {mediaPreview && (
                <div className="relative w-28 h-28 rounded-xl overflow-hidden border border-amber-400/50">
                  {mediaFile?.type.startsWith('video') ? (
                    <video src={mediaPreview} className="w-full h-full object-cover" />
                  ) : (
                    <img src={mediaPreview} alt="Preview" className="w-full h-full object-cover" />
                  )}
                  <button
                    type="button"
                    onClick={() => { setMediaFile(null); setMediaPreview(null); }}
                    className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px]"
                  >
                    ✕
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <label className="cursor-pointer flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition">
                  <Upload className="w-4 h-4 text-amber-400" />
                  <span>ارفاق لقطة/فيديو</span>
                  <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleMediaUpload}
                    className="hidden"
                  />
                </label>

                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition"
                >
                  نشر
                </button>
              </div>
            </form>

            {/* قائمة التعليقات */}
            <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
              {comments.length === 0 ? (
                <p className="text-center text-xs text-slate-500 py-6">لا توجد تعليقات بعد. كن أول من يشارك بلقطة أو رأي!</p>
              ) : (
                comments.map((item) => (
                  <div key={item.id} className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                    <div className="flex justify-between items-center text-xs text-slate-400">
                      <span className="font-bold text-amber-300">مشجع رياضى</span>
                      <span>{item.time}</span>
                    </div>
                    {item.text && <p className="text-xs text-slate-200 leading-relaxed">{item.text}</p>}
                    {item.media && (
                      <div className="mt-2 rounded-xl overflow-hidden max-w-md border border-slate-800">
                        {item.mediaType === 'video' ? (
                          <video src={item.media} controls className="w-full max-h-60 object-cover" />
                        ) : (
                          <img src={item.media} alt="Penalty Shot" className="w-full max-h-60 object-cover" />
                        )}
                      </div>
                    )}
                    <div className="flex items-center justify-end pt-1">
                      <button
                        onClick={() => handleLike(item.id)}
                        className="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-amber-400 transition"
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                        <span>{item.likes}</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* القسم الأيسر: الترتيب والهداف */}
        <aside className="space-y-8">
          
          {/* جدول الترتيب */}
          <div className="bg-slate-900/90 rounded-3xl p-6 border border-slate-800 space-y-4">
            <h2 className="text-md font-bold flex items-center gap-2 text-amber-400">
              <Medal className="w-5 h-5" /> جدول الترتيب العام
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-2">#</th>
                    <th className="py-2">الفريق</th>
                    <th className="py-2 text-center">لعب</th>
                    <th className="py-2 text-center">النقاط</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {teams.map((team, index) => (
                    <tr key={index} className="hover:bg-slate-800/30">
                      <td className="py-3 font-bold text-amber-400">{index + 1}</td>
                      <td className="py-3 font-semibold">{team.name}</td>
                      <td className="py-3 text-center text-slate-400">{team.played}</td>
                      <td className="py-3 text-center font-bold text-emerald-400">{team.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* هداف البطولة */}
          <div className="bg-gradient-to-br from-indigo-950/40 to-slate-900 rounded-3xl p-6 border border-indigo-500/20 space-y-4">
            <h3 className="text-md font-bold flex items-center gap-2 text-indigo-300">
              <Flame className="w-5 h-5 text-orange-400" /> هداف البطولة
            </h3>
            <div className="flex items-center gap-4 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
              <div className="w-12 h-12 bg-amber-400 text-slate-950 rounded-xl flex items-center justify-center font-black text-xl">
                ⚽
              </div>
              <div>
                <p className="font-bold text-slate-100 text-sm">{topScorer.name}</p>
                <p className="text-xs text-slate-400">{topScorer.goals} أهداف ({topScorer.team})</p>
              </div>
            </div>
          </div>

        </aside>

      </main>
    </div>
  );
}
