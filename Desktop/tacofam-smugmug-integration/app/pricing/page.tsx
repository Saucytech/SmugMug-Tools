'use client';

import { useState } from 'react';
import { Check, X, Sparkles, Heart, Code2, Grid, Brain, Upload, ClipboardCheck, Eye, Book, Database, Zap, TrendingUp, Clock, Shield, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import ToolboxHeader from '@/components/ToolboxHeader';

export default function PricingPage() {
  const router = useRouter();
  const [billingCycle, setBillingCycle] = useState<'lifetime' | 'compare'>('lifetime');

  const features = [
    { name: 'Client Favorites Manager', icon: <Heart className="w-5 h-5" />, value: '$29/mo' },
    { name: 'Embed & Sell Generator', icon: <Grid className="w-5 h-5" />, value: '$19/mo' },
    { name: 'Multi-Album Selector', icon: <Grid className="w-5 h-5" />, value: '$15/mo' },
    { name: 'AI MetaData Monster', icon: <Code2 className="w-5 h-5" />, value: 'Pay-per-use' },
    { name: 'AI Gallery Creator', icon: <Sparkles className="w-5 h-5" />, value: 'Pay-per-use' },
    { name: 'Photo Organizer AI', icon: <Brain className="w-5 h-5" />, value: 'Pay-per-use' },
    { name: 'Guest Upload Manager', icon: <Upload className="w-5 h-5" />, value: 'Included' },
    { name: 'Sanity Checker AI', icon: <ClipboardCheck className="w-5 h-5" />, value: 'Pay-per-use' },
    { name: 'API Reference Browser', icon: <Book className="w-5 h-5" />, value: 'Included' },
    { name: 'Metadata Viewer', icon: <Eye className="w-5 h-5" />, value: 'Included' },
  ];

  const faqs = [
    {
      q: 'What exactly do I get with the one-time payment?',
      a: 'Lifetime access to all 10 SmugMug tools, including the Favorites Manager, Embed & Sell Generator, Multi-Album Selector, and all developer tools. AI features require coins (pay-as-you-go).'
    },
    {
      q: 'How do AI Coins work?',
      a: 'Coins are our pay-as-you-go currency for AI-powered features. You only pay for what you use. 10,000 coins (free with signup) can process hundreds of photos with AI metadata generation.'
    },
    {
      q: 'Is there a monthly subscription?',
      a: 'No! One-time $197 payment for lifetime access. The only ongoing cost is AI coins, which you purchase only when needed.'
    },
    {
      q: 'What if I only use SmugMug occasionally?',
      a: 'Perfect! Since there\'s no monthly fee, your access never expires. Use it once a year or every day - you only pay once.'
    },
    {
      q: 'Can I use this with multiple SmugMug accounts?',
      a: 'Yes! One license works with unlimited SmugMug accounts. Great for agencies or photographers with multiple brands.'
    },
    {
      q: 'Do you offer refunds?',
      a: '30-day money-back guarantee. If Smugtools doesn\'t save you time and make your workflow better, full refund - no questions asked.'
    },
  ];

  const testimonials = [
    {
      name: 'Sarah Johnson',
      role: 'Wedding Photographer',
      avatar: 'SJ',
      quote: 'The Client Favorites Manager alone is worth $197. My clients love being able to select their favorites, and it saves me hours of back-and-forth emails.'
    },
    {
      name: 'Mike Chen',
      role: 'Real Estate Photographer',
      avatar: 'MC',
      quote: 'AI Gallery Creator is a game-changer. It organizes my property shoots into perfect folders in seconds. Used to take me 30 minutes per shoot manually.'
    },
    {
      name: 'Jessica Martinez',
      role: 'Portrait Studio Owner',
      avatar: 'JM',
      quote: 'MetaData Monster processed 5,000 photos with perfect titles and keywords in under an hour. Would have taken me days. Best investment for my SmugMug workflow.'
    },
  ];

  return (
    <>
      <ToolboxHeader />
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-4">
          <div className="max-w-6xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 px-4 py-2 rounded-full text-sm font-semibold mb-6">
              <Zap className="w-4 h-4" />
              One-Time Payment • Lifetime Access
            </div>

            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              The Complete SmugMug
              <span className="block bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Professional Toolbox
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
              10 powerful tools that save hours every week. One price, yours forever.
              No subscriptions, no recurring fees.
            </p>

            {/* Value Comparison */}
            <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl mx-auto mb-12">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="text-sm text-gray-500 mb-1">Competing Tools Cost</div>
                  <div className="text-3xl font-bold text-gray-400 line-through">$756/year</div>
                  <div className="text-sm text-gray-500 mt-1">$63/mo × 12 months</div>
                </div>
                <div className="text-4xl text-gray-300">→</div>
                <div>
                  <div className="text-sm text-purple-600 font-semibold mb-1">Smugtools</div>
                  <div className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    $197
                  </div>
                  <div className="text-sm text-gray-600 mt-1">One-time • Forever</div>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 text-green-600 font-semibold">
                <TrendingUp className="w-5 h-5" />
                Save $559 in the first year alone
              </div>
            </div>

            <button
              onClick={() => router.push('/auth/signup')}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-xl font-bold px-12 py-5 rounded-xl shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all"
            >
              Get Lifetime Access - $197
            </button>

            <p className="text-sm text-gray-500 mt-4">
              <Shield className="w-4 h-4 inline mr-1" />
              30-day money-back guarantee • Instant access
            </p>
          </div>
        </section>

        {/* What's Included */}
        <section className="py-16 px-4 bg-white">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-4xl font-bold text-center text-gray-900 mb-4">
              Everything You Need, Nothing You Don't
            </h2>
            <p className="text-xl text-gray-600 text-center mb-12 max-w-2xl mx-auto">
              10 professional-grade tools built specifically for SmugMug photographers
            </p>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, idx) => (
                <div key={idx} className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border-2 border-purple-100">
                  <div className="flex items-start gap-4">
                    <div className="bg-gradient-to-br from-purple-500 to-pink-500 text-white p-3 rounded-lg">
                      {feature.icon}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 mb-1">{feature.name}</h3>
                      <p className="text-sm text-purple-600 font-semibold">{feature.value}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Comparison */}
        <section className="py-16 px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-4xl font-bold text-center text-gray-900 mb-12">
              One Simple Price
            </h2>

            <div className="grid md:grid-cols-2 gap-8 mb-12">
              {/* Smugtools */}
              <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl shadow-2xl overflow-hidden transform hover:scale-105 transition-all">
                <div className="bg-white/10 backdrop-blur-sm p-6 text-white">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-2xl font-bold">Smugtools</h3>
                    <div className="bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-xs font-bold">
                      BEST VALUE
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-6xl font-bold">$197</span>
                  </div>
                  <div className="text-purple-100">One-time payment • Lifetime access</div>
                </div>

                <div className="p-6 bg-white">
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                      <span className="text-gray-700">All 10 tools - unlimited use</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                      <span className="text-gray-700">10,000 welcome AI coins ($10 value)</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                      <span className="text-gray-700">Lifetime updates & new features</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                      <span className="text-gray-700">Use with unlimited SmugMug accounts</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                      <span className="text-gray-700">Priority email support</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                      <span className="text-gray-700">30-day money-back guarantee</span>
                    </li>
                  </ul>

                  <button
                    onClick={() => router.push('/auth/signup')}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg"
                  >
                    Get Started Now
                  </button>
                </div>
              </div>

              {/* Competing Tools */}
              <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-200 overflow-hidden opacity-75">
                <div className="bg-gray-100 p-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">Competing Tools</h3>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-6xl font-bold text-gray-700">$63</span>
                    <span className="text-gray-500">/month</span>
                  </div>
                  <div className="text-gray-600">$756/year • Every year</div>
                </div>

                <div className="p-6">
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                      <span className="text-gray-500">Multiple separate subscriptions</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <X className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                      <span className="text-gray-500 line-through">One-time payment</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <X className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                      <span className="text-gray-500 line-through">SmugMug-specific features</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                      <span className="text-gray-500">Limited to 1-2 accounts</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                      <span className="text-gray-500">Cancel anytime (lose access)</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <X className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                      <span className="text-gray-500 line-through">AI metadata generation</span>
                    </li>
                  </ul>

                  <div className="text-center py-4 text-gray-500 font-semibold border-2 border-gray-300 rounded-xl">
                    Not Available
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-6 text-center">
              <div className="text-4xl font-bold text-green-700 mb-2">
                Break Even in 3 Months
              </div>
              <p className="text-green-600 text-lg">
                After that, it's like getting $63/month worth of tools completely free
              </p>
            </div>
          </div>
        </section>

        {/* AI Coins Pricing */}
        <section className="py-16 px-4 bg-white">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl font-bold text-center text-gray-900 mb-4">
              AI Features: Pay Only for What You Use
            </h2>
            <p className="text-xl text-gray-600 text-center mb-12">
              No subscription. Purchase coins only when you need AI processing.
            </p>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-6">
                <div className="text-center mb-4">
                  <div className="text-4xl font-bold text-gray-900">5,000</div>
                  <div className="text-sm text-gray-600">Coins</div>
                </div>
                <div className="text-center text-3xl font-bold text-green-600 mb-4">$5</div>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li>• ~250 photos with AI metadata</li>
                  <li>• Perfect for occasional use</li>
                </ul>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-400 rounded-xl p-6 transform scale-105 shadow-xl">
                <div className="bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full inline-block mb-4">
                  MOST POPULAR
                </div>
                <div className="text-center mb-4">
                  <div className="text-4xl font-bold text-gray-900">25,000</div>
                  <div className="text-sm text-gray-600">Coins</div>
                </div>
                <div className="text-center text-3xl font-bold text-blue-600 mb-4">$20</div>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li>• ~1,250 photos with AI metadata</li>
                  <li>• Best for regular users</li>
                </ul>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-6">
                <div className="bg-purple-500 text-white text-xs font-bold px-3 py-1 rounded-full inline-block mb-4">
                  20% BONUS
                </div>
                <div className="text-center mb-4">
                  <div className="text-4xl font-bold text-gray-900">100,000</div>
                  <div className="text-sm text-gray-600">Coins</div>
                </div>
                <div className="text-center text-3xl font-bold text-purple-600 mb-4">$75</div>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li>• ~5,000 photos with AI metadata</li>
                  <li>• Best value for power users</li>
                </ul>
              </div>
            </div>

            <p className="text-center text-sm text-gray-500 mt-6">
              Coins never expire. Buy once, use anytime.
            </p>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-4xl font-bold text-center text-gray-900 mb-4">
              Loved by SmugMug Professionals
            </h2>
            <p className="text-xl text-gray-600 text-center mb-12">
              Join hundreds of photographers saving time and growing their business
            </p>

            <div className="grid md:grid-cols-3 gap-8">
              {testimonials.map((testimonial, idx) => (
                <div key={idx} className="bg-white rounded-xl shadow-lg p-6 border-2 border-gray-100">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <div className="font-bold text-gray-900">{testimonial.name}</div>
                      <div className="text-sm text-gray-500">{testimonial.role}</div>
                    </div>
                  </div>
                  <p className="text-gray-700 italic">"{testimonial.quote}"</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16 px-4 bg-white">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl font-bold text-center text-gray-900 mb-12">
              Frequently Asked Questions
            </h2>

            <div className="space-y-6">
              {faqs.map((faq, idx) => (
                <div key={idx} className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border-2 border-purple-100">
                  <h3 className="font-bold text-lg text-gray-900 mb-2">{faq.q}</h3>
                  <p className="text-gray-700">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-20 px-4 bg-gradient-to-r from-purple-600 to-pink-600">
          <div className="max-w-4xl mx-auto text-center text-white">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Ready to Transform Your SmugMug Workflow?
            </h2>
            <p className="text-xl md:text-2xl mb-8 text-purple-100">
              Join photographers who've already saved hundreds of hours
            </p>

            <button
              onClick={() => router.push('/auth/signup')}
              className="bg-white text-purple-600 hover:bg-gray-100 text-xl font-bold px-12 py-5 rounded-xl shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all inline-flex items-center gap-3"
            >
              Get Lifetime Access - $197
              <Sparkles className="w-6 h-6" />
            </button>

            <div className="mt-6 flex items-center justify-center gap-6 text-purple-100">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                <span>30-day guarantee</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                <span>Instant access</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                <span>Join 500+ users</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
