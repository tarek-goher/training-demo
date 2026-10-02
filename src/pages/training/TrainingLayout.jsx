import { NavLink, Outlet } from 'react-router-dom';
import { Layers, BookOpen, CalendarCheck, BarChart3, Settings, Globe } from 'lucide-react';
import { useLang } from '../../i18n/LanguageContext';
import { useL, useLogo } from './shared';

export default function TrainingLayout() {
  const L = useL();
  const logo = useLogo();
  const { toggleLang } = useLang();

  const tabs = [
    { to: '/groups', label: L('الجروبات', 'Groups'), icon: Layers },
    { to: '/courses', label: L('الكورسات والأسعار', 'Courses & Prices'), icon: BookOpen },
    { to: '/attendance', label: L('الحضور والغياب', 'Attendance'), icon: CalendarCheck },
    { to: '/reports', label: L('التقارير', 'Reports'), icon: BarChart3 },
    { to: '/settings', label: L('الإعدادات', 'Settings'), icon: Settings },
  ];

  return (
    <div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 mb-6 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-3 me-2">
          <img src={logo.src} alt="logo" className="w-11 h-11 object-contain" />
          <div className="leading-tight">
            <p className="font-extrabold text-navy">{L('الإدارة', 'Management')}</p>
            <p className="text-[11px] text-gray-400">Future Biotech Invators</p>
          </div>
        </div>
        <nav className="flex flex-wrap gap-1.5">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  isActive ? 'bg-navy text-white' : 'text-gray-500 hover:bg-gray-50'
                }`
              }
            >
              <t.icon size={16} /> {t.label}
            </NavLink>
          ))}
        </nav>
        <button onClick={toggleLang} className="ms-auto flex items-center gap-1.5 text-sm text-gray-400 hover:text-teal-dark" title="AR / EN">
          <Globe size={17} /> {L('English', 'عربي')}
        </button>
      </div>
      <Outlet />
    </div>
  );
}
