import { Fragment } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Disclosure, Menu, Transition } from '@headlessui/react';
import {
  Bars3Icon,
  XMarkIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import NotificationIndicator from '../../modules/notifications/components/NotificationIndicator';

export default function HeaderNavigation() {
  const { pathname } = useLocation();
  const { user, logout, hasPermission } = useAuth();

  return (
    <Disclosure as="nav" className="bg-white shadow-sm">
      {({ open }) => (
        <>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 justify-between">
              <div className="flex">
                <div className="flex flex-shrink-0 items-center">
                  <Link to="/">
                    <img
                      className="h-8 w-auto"
                      src="/logo.png"
                      alt="Company Logo"
                    />
                  </Link>
                </div>
                <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                  {/* ... existing navigation links ... */}
                </div>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:items-center">
                {/* Add NotificationIndicator before the profile menu */}
                <NotificationIndicator />
                
                {/* Profile dropdown */}
                <Menu as="div" className="relative ml-3">
                  <div>
                    <Menu.Button className="flex rounded-full bg-white text-sm focus:outline-none">
                      <span className="sr-only">Open user menu</span>
                      {user?.avatar ? (
                        <img
                          className="h-8 w-8 rounded-full"
                          src={user.avatar}
                          alt={`${user.firstName} ${user.lastName}`}
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
                          <span className="text-indigo-800 font-medium text-sm">
                            {user?.firstName?.[0]}
                            {user?.lastName?.[0]}
                          </span>
                        </div>
                      )}
                    </Menu.Button>
                  </div>
                  {/* ... existing dropdown menu ... */}
                </Menu>
              </div>
              {/* ... mobile menu button ... */}
            </div>
          </div>

          {/* ... mobile menu panel ... */}
        </>
      )}
    </Disclosure>
  );
} 