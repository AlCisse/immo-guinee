'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Home,
  Eye,
  Heart,
  MessageSquare,
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Clock,
  ArrowUpRight,
  Building2,
  MoreHorizontal,
  ChevronDown,
  Download,
  Filter,
} from 'lucide-react';

// Stats Card Component
function StatCard({
  title,
  value,
  change,
  changeLabel,
  icon: Icon,
  color,
}: {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: React.ElementType;
  color: 'primary' | 'success' | 'warning' | 'error' | 'purple';
}) {
  const colorStyles = {
    primary: 'bg-primary-50 dark:bg-primary-500/10 text-primary-500',
    success: 'bg-success-50 dark:bg-success-500/10 text-success-500',
    warning: 'bg-warning-50 dark:bg-warning-500/10 text-warning-500',
    error: 'bg-error-50 dark:bg-error-500/10 text-error-500',
    purple: 'bg-purple-50 dark:bg-purple-500/10 text-purple-500',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-soft"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-xl ${colorStyles[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
        {change !== undefined && (
          <span className={`flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-full ${
            change > 0
              ? 'bg-success-100 text-success-700 dark:bg-success-500/10 dark:text-success-400'
              : change < 0
              ? 'bg-error-100 text-error-700 dark:bg-error-500/10 dark:text-error-400'
              : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-500/10 dark:text-neutral-400'
          }`}>
            {change > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : change < 0 ? <TrendingDown className="w-3.5 h-3.5" /> : null}
            {change > 0 ? '+' : ''}{change}%
          </span>
        )}
      </div>
      <h3 className="text-3xl font-bold text-neutral-900 dark:text-white mb-1">
        {typeof value === 'number' ? value.toLocaleString('fr-FR') : value}
      </h3>
      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        {title}
        {changeLabel && <span className="text-neutral-400"> • {changeLabel}</span>}
      </p>
    </motion.div>
  );
}

// Property Performance Card
function PropertyPerformance({
  title,
  address,
  views,
  favorites,
  inquiries,
  status,
}: {
  title: string;
  address: string;
  views: number;
  favorites: number;
  inquiries: number;
  status: 'active' | 'pending' | 'rented';
}) {
  const statusStyles = {
    active: { label: 'Active', color: 'bg-success-100 text-success-700 dark:bg-success-500/10 dark:text-success-400' },
    pending: { label: 'En attente', color: 'bg-warning-100 text-warning-700 dark:bg-warning-500/10 dark:text-warning-400' },
    rented: { label: 'Louée', color: 'bg-primary-100 text-primary-700 dark:bg-primary-500/10 dark:text-primary-400' },
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-4 p-4 hover:bg-neutral-50 dark:hover:bg-dark-bg rounded-xl transition-colors"
    >
      <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-500/20 dark:to-primary-600/20 flex items-center justify-center flex-shrink-0">
        <Building2 className="w-8 h-8 text-primary-500" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-semibold text-neutral-900 dark:text-white truncate">
            {title}
          </h4>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles[status].color}`}>
            {statusStyles[status].label}
          </span>
        </div>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate">
          {address}
        </p>
      </div>

      <div className="flex items-center gap-6 flex-shrink-0">
        <div className="text-center">
          <p className="text-lg font-semibold text-neutral-900 dark:text-white">{views}</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Vues</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-neutral-900 dark:text-white">{favorites}</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Favoris</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-neutral-900 dark:text-white">{inquiries}</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Demandes</p>
        </div>
      </div>

      <button className="p-2 hover:bg-neutral-100 dark:hover:bg-dark-border rounded-lg transition-colors">
        <MoreHorizontal className="w-5 h-5 text-neutral-400" />
      </button>
    </motion.div>
  );
}

// Simple Bar Chart
function BarChart({ data, label }: { data: number[]; label: string }) {
  const max = Math.max(...data);

  return (
    <div>
      <div className="flex items-end justify-between gap-2 h-32 mb-2">
        {data.map((value, index) => (
          <motion.div
            key={index}
            initial={{ height: 0 }}
            animate={{ height: `${(value / max) * 100}%` }}
            transition={{ delay: index * 0.05 }}
            className="flex-1 bg-gradient-to-t from-primary-500 to-primary-400 rounded-t-lg min-h-[4px]"
          />
        ))}
      </div>
      <p className="text-xs text-neutral-500 dark:text-neutral-400 text-center">{label}</p>
    </div>
  );
}

// Donut Chart Component
function DonutChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((acc, item) => acc + item.value, 0);
  let currentAngle = 0;

  return (
    <div className="flex items-center gap-6">
      <div className="relative w-32 h-32">
        <svg viewBox="0 0 100 100" className="transform -rotate-90">
          {data.map((item, index) => {
            const angle = (item.value / total) * 360;
            const startAngle = currentAngle;
            currentAngle += angle;

            const startRad = (startAngle * Math.PI) / 180;
            const endRad = (currentAngle * Math.PI) / 180;

            const x1 = 50 + 40 * Math.cos(startRad);
            const y1 = 50 + 40 * Math.sin(startRad);
            const x2 = 50 + 40 * Math.cos(endRad);
            const y2 = 50 + 40 * Math.sin(endRad);

            const largeArcFlag = angle > 180 ? 1 : 0;

            return (
              <motion.path
                key={index}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.1 }}
                d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2} Z`}
                fill={item.color}
              />
            );
          })}
          <circle cx="50" cy="50" r="25" className="fill-white dark:fill-dark-card" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <p className="text-2xl font-bold text-neutral-900 dark:text-white">{total}</p>
            <p className="text-xs text-neutral-500">Total</p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {data.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-sm text-neutral-600 dark:text-neutral-300">{item.label}</span>
            <span className="text-sm font-medium text-neutral-900 dark:text-white ml-auto">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function OwnerStatisticsPage() {
  const [period, setPeriod] = useState<'7d' | '30d' | '90d' | '1y'>('30d');

  // Mock data
  const viewsData = [120, 150, 180, 140, 200, 230, 190, 210, 250, 220, 280, 260];
  const propertyDistribution = [
    { label: 'Appartements', value: 5, color: '#f97316' },
    { label: 'Villas', value: 2, color: '#22c55e' },
    { label: 'Bureaux', value: 3, color: '#3b82f6' },
  ];

  const recentInquiries = [
    { name: 'Mamadou Diallo', property: 'Villa à Kipé', time: 'Il y a 2h' },
    { name: 'Fatoumata Barry', property: 'Appartement Ratoma', time: 'Il y a 5h' },
    { name: 'Ibrahima Sow', property: 'Bureau Kaloum', time: 'Hier' },
  ];

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-dark-bg p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
              Mes statistiques
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400">
              Vue d'ensemble de vos performances
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Period Selector */}
            <div className="relative">
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as typeof period)}
                className="appearance-none pl-4 pr-10 py-2 bg-white dark:bg-dark-card border border-neutral-200 dark:border-dark-border rounded-xl text-sm focus:ring-2 focus:ring-primary-500 dark:text-white cursor-pointer"
              >
                <option value="7d">7 derniers jours</option>
                <option value="30d">30 derniers jours</option>
                <option value="90d">3 derniers mois</option>
                <option value="1y">Cette année</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
            </div>

            {/* Export Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-dark-card border border-neutral-200 dark:border-dark-border rounded-xl text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-dark-bg transition-colors"
            >
              <Download className="w-4 h-4" />
              Exporter
            </motion.button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Propriétés actives"
            value={10}
            change={12}
            changeLabel="vs mois dernier"
            icon={Home}
            color="primary"
          />
          <StatCard
            title="Vues totales"
            value="2,847"
            change={23}
            changeLabel="vs mois dernier"
            icon={Eye}
            color="success"
          />
          <StatCard
            title="Demandes reçues"
            value={48}
            change={-5}
            changeLabel="vs mois dernier"
            icon={MessageSquare}
            color="warning"
          />
          <StatCard
            title="Visites planifiées"
            value={12}
            change={18}
            changeLabel="vs mois dernier"
            icon={Calendar}
            color="purple"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Views Chart */}
          <div className="lg:col-span-2 bg-white dark:bg-dark-card rounded-2xl shadow-soft p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                  Évolution des vues
                </h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Vues de vos annonces ce mois
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-sm text-success-600 font-medium">
                  <TrendingUp className="w-4 h-4" />
                  +23%
                </span>
              </div>
            </div>
            <BarChart data={viewsData} label="12 derniers mois" />
          </div>

          {/* Property Distribution */}
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-soft p-6">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-6">
              Répartition des biens
            </h2>
            <DonutChart data={propertyDistribution} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Property Performance */}
          <div className="lg:col-span-2 bg-white dark:bg-dark-card rounded-2xl shadow-soft">
            <div className="p-6 border-b border-neutral-200 dark:border-dark-border">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                    Performance des annonces
                  </h2>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Statistiques par propriété
                  </p>
                </div>
                <button className="flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400 font-medium hover:underline">
                  Voir tout
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="divide-y divide-neutral-100 dark:divide-dark-border">
              <PropertyPerformance
                title="Villa moderne à Kipé"
                address="Kipé, Ratoma"
                views={542}
                favorites={34}
                inquiries={12}
                status="active"
              />
              <PropertyPerformance
                title="Appartement 3 pièces"
                address="Nongo, Ratoma"
                views={328}
                favorites={21}
                inquiries={8}
                status="rented"
              />
              <PropertyPerformance
                title="Bureau commercial"
                address="Centre-ville, Kaloum"
                views={187}
                favorites={15}
                inquiries={5}
                status="active"
              />
              <PropertyPerformance
                title="Studio meublé"
                address="Landréah, Dixinn"
                views={94}
                favorites={8}
                inquiries={3}
                status="pending"
              />
            </div>
          </div>

          {/* Recent Inquiries & Quick Actions */}
          <div className="space-y-6">
            {/* Recent Inquiries */}
            <div className="bg-white dark:bg-dark-card rounded-2xl shadow-soft p-6">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
                Demandes récentes
              </h2>
              <div className="space-y-4">
                {recentInquiries.map((inquiry, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-3"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-medium">
                      {inquiry.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                        {inquiry.name}
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                        {inquiry.property}
                      </p>
                    </div>
                    <span className="text-xs text-neutral-400 flex-shrink-0">
                      {inquiry.time}
                    </span>
                  </motion.div>
                ))}
              </div>
              <button className="w-full mt-4 py-2.5 border border-neutral-200 dark:border-dark-border rounded-xl text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-dark-bg transition-colors">
                Voir toutes les demandes
              </button>
            </div>

            {/* Earnings Summary */}
            <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl shadow-soft p-6 text-white">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-white/20 rounded-xl">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-white/80 text-sm">Revenus estimés</p>
                  <p className="text-2xl font-bold">45 000 000 GNF</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/70">Ce mois</span>
                <span className="flex items-center gap-1 bg-white/20 px-2 py-1 rounded-full">
                  <TrendingUp className="w-3.5 h-3.5" />
                  +15%
                </span>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white dark:bg-dark-card rounded-2xl shadow-soft p-6">
              <h3 className="font-semibold text-neutral-900 dark:text-white mb-4">
                Aperçu rapide
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                    <Eye className="w-4 h-4" />
                    Vues aujourd'hui
                  </div>
                  <span className="font-semibold text-neutral-900 dark:text-white">127</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                    <Heart className="w-4 h-4" />
                    Nouveaux favoris
                  </div>
                  <span className="font-semibold text-neutral-900 dark:text-white">8</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                    <MessageSquare className="w-4 h-4" />
                    Messages non lus
                  </div>
                  <span className="font-semibold text-primary-500">3</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                    <Clock className="w-4 h-4" />
                    Temps de réponse moyen
                  </div>
                  <span className="font-semibold text-neutral-900 dark:text-white">2h</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
