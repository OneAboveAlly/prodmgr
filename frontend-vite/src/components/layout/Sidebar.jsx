// Sidebar.jsx

import React from 'react';
import { NavLink } from 'react-router-dom';
import { hasPermission } from '../utils/permissions';

const Sidebar = () => {
  return (
    <aside className="sidebar">
      {/* Other navigation sections */}

      {/* Production section */}
      {hasPermission('production', 'read') && (
        <div>
          <span className="text-gray-400 uppercase text-xs font-semibold px-3 block mb-2">
            Production
          </span>
          <ul className="space-y-1">
            <li>
              <NavLink
                to="/production"
                className={({ isActive }) =>
                  `flex items-center px-3 py-2 text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-md ${
                    isActive ? 'bg-indigo-50 text-indigo-600 font-medium' : ''
                  }`
                }
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Active Guides
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/production/templates"
                className={({ isActive }) =>
                  `flex items-center px-3 py-2 text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-md ${
                    isActive ? 'bg-indigo-50 text-indigo-600 font-medium' : ''
                  }`
                }
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                </svg>
                Templates
              </NavLink>
            </li>
            {hasPermission('production', 'manage') && (
              <li>
                <NavLink
                  to="/production/archived"
                  className={({ isActive }) =>
                    `flex items-center px-3 py-2 text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-md ${
                      isActive ? 'bg-indigo-50 text-indigo-600 font-medium' : ''
                    }`
                  }
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                  Archived
                </NavLink>
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Other navigation sections */}
    </aside>
  );
};

export default Sidebar;