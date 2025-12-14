'use client';

import { useState } from 'react';
import { useAnalytics, formatNumber, formatMoney } from '@/lib/hooks/useAdmin';
import { BarChart3, Users, Building2, FileText, CreditCard, TrendingUp, TrendingDown, Star } from 'lucide-react';

export default function StatsPage() {
  const [period, setPeriod] = useState(30);
  const { data, isLoading } = useAnalytics(period);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <BarChart3 className="w-7 h-7 text-primary-500" />
            Statistiques de la plateforme
          </h1>
          <p className="text-gray-600 mt-1">Vue d&apos;ensemble des KPIs et métriques</p>
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Période:</span>
          <select
            value={period}
            onChange={(e) => setPeriod(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value={7}>7 derniers jours</option>
            <option value={30}>30 derniers jours</option>
            <option value={90}>90 derniers jours</option>
            <option value={365}>12 derniers mois</option>
          </select>
        </div>
      </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Users Stats */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <span className="flex items-center text-sm text-green-600">
                <TrendingUp className="w-4 h-4 mr-1" />
                +{data?.users.new_users || 0}
              </span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{formatNumber(data?.users.total_users || 0)}</div>
            <div className="text-sm text-gray-500">Utilisateurs totaux</div>
            <div className="mt-2 text-sm">
              <span className="text-green-600">{data?.users.verified_users || 0}</span>
              <span className="text-gray-400"> vérifiés</span>
            </div>
          </div>

          {/* Listings Stats */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Building2 className="w-6 h-6 text-green-600" />
              </div>
              <span className="flex items-center text-sm text-green-600">
                <TrendingUp className="w-4 h-4 mr-1" />
                +{data?.listings.new_listings || 0}
              </span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{formatNumber(data?.listings.total_listings || 0)}</div>
            <div className="text-sm text-gray-500">Annonces totales</div>
            <div className="mt-2 text-sm">
              <span className="text-green-600">{data?.listings.active_listings || 0}</span>
              <span className="text-gray-400"> actives</span>
            </div>
          </div>

          {/* Contracts Stats */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <FileText className="w-6 h-6 text-purple-600" />
              </div>
              <span className="flex items-center text-sm text-green-600">
                <TrendingUp className="w-4 h-4 mr-1" />
                +{data?.contracts.contracts_this_period || 0}
              </span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{formatNumber(data?.contracts.total_contracts || 0)}</div>
            <div className="text-sm text-gray-500">Contrats totaux</div>
            <div className="mt-2 text-sm">
              <span className="text-green-600">{data?.contracts.signed_contracts || 0}</span>
              <span className="text-gray-400"> signés</span>
            </div>
          </div>

          {/* Revenue Stats */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <CreditCard className="w-6 h-6 text-yellow-600" />
              </div>
              <span className="flex items-center text-sm text-green-600">
                <TrendingUp className="w-4 h-4 mr-1" />
                {data?.transactions.transactions_this_period || 0}
              </span>
            </div>
            <div className="text-xl font-bold text-gray-900">{formatMoney(data?.transactions.total_volume_gnf || 0)}</div>
            <div className="text-sm text-gray-500">Volume total</div>
            <div className="mt-2 text-sm">
              <span className="text-blue-600">{formatMoney(data?.transactions.commission_earned_gnf || 0)}</span>
              <span className="text-gray-400"> commissions</span>
            </div>
          </div>
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Users by Role */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Utilisateurs par rôle</h3>
            <div className="space-y-4">
              {Object.entries(data?.users.users_by_role || {}).map(([role, count]) => (
                <div key={role} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 capitalize">{role.toLowerCase()}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${((count as number) / (data?.users.total_users || 1)) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-12 text-right">{count as number}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Listings by Type */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Annonces par type</h3>
            <div className="space-y-4">
              {Object.entries(data?.listings.listings_by_type || {}).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{type}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full"
                        style={{ width: `${((count as number) / (data?.listings.total_listings || 1)) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-12 text-right">{count as number}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quality Metrics */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Métriques de qualité</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-3xl font-bold text-yellow-500 mb-2">
                {parseFloat(data?.quality?.average_rating || 0).toFixed(1)}
                <Star className="w-8 h-8 fill-yellow-500" />
              </div>
              <div className="text-sm text-gray-500">Note moyenne</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 mb-2">
                {data?.quality.total_ratings || 0}
              </div>
              <div className="text-sm text-gray-500">Avis au total</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600 mb-2">
                {data?.quality.pending_disputes || 0}
              </div>
              <div className="text-sm text-gray-500">Litiges en cours</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {data?.quality.resolved_disputes || 0}
              </div>
              <div className="text-sm text-gray-500">Litiges résolus</div>
            </div>
          </div>
        </div>

      {/* Footer */}
      <div className="mt-6 text-center text-sm text-gray-400">
        Données générées le {data?.generated_at ? new Date(data.generated_at).toLocaleString('fr-FR') : '-'}
      </div>
    </div>
  );
}
