import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Bot,
  Store,
  Sliders,
  X,
  ShieldCheck,
  Smartphone,
  Play,
  Pause,
  Scan,
  BrainCircuit,
  CreditCard,
  QrCode,
  CheckCircle2,
  AlertTriangle,
  Volume2,
  VolumeX
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { managerService } from '../services/managerService';
import { voiceService } from '../services/voiceService';
import { GetStartedModal } from '../components/GetStartedModal';
import { Store3DCanvas, StageId, AgentViewMode } from '../components/Store3DCanvas';
import confetti from 'canvas-confetti';

import { LanguageCode } from '../types';

interface StoryStage {
  id: StageId;
  stepNumber: string;
  title: string;
  badge: string;
  badgeColor: string;
  storyText: string;
  interactionPrompt?: string;
  agentContext: string;
}

const STAGE_VOICE_SCRIPTS: Record<LanguageCode, Record<StageId, string>> = {
  en: {
    1: 'Welcome to GrocerAI, Branch 104. Automated entrance doors are open. Please proceed inside to Kiosk 01.',
    2: 'Welcome to Kiosk 01. Session SESS 104 is created. Scan the QR code on the kiosk screen with your phone to sync your live cart.',
    3: 'Session connected. You are in Aisle 2. You asked: where can I find cooking oil? Fortune Sunflower Oil is located on Shelf B2 on your right. Adding item to cart.',
    4: 'Shopping complete. Please return to Kiosk 01 for verification. Optical camera and barcode scanner are active. All pre-packaged items and pack sizes verified.',
    5: 'Cart verified. Scan the Demo Payment QR on Kiosk 01. Tap Done to complete the simulation. No money is transferred. Thank you for shopping with GrocerAI.'
  },
  te: {
    1: 'à°—à±à°°à±‹à°¸à°°à± à°à°, à°¬à±à°°à°¾à°‚à°šà± 104à°•à°¿ à°¸à±à°µà°¾à°—à°¤à°‚. à°†à°Ÿà±‹à°®à±‡à°Ÿà°¿à°•à± à°ªà±à°°à°µà±‡à°¶ à°¦à±à°µà°¾à°°à°¾à°²à± à°¤à±†à°°à±à°šà±à°•à±à°¨à±à°¨à°¾à°¯à°¿. à°¦à°¯à°šà±‡à°¸à°¿ à°•à°¿à°¯à±‹à°¸à±à°•à± 01 à°µà°¦à±à°¦à°•à± à°µà±†à°³à±à°³à°‚à°¡à°¿.',
    2: 'à°•à°¿à°¯à±‹à°¸à±à°•à± 01à°•à°¿ à°¸à±à°µà°¾à°—à°¤à°‚. à°¸à±†à°·à°¨à± SESS 104 à°¸à±ƒà°·à±à°Ÿà°¿à°‚à°šà°¬à°¡à°¿à°‚à°¦à°¿. à°®à±€ à°²à±ˆà°µà± à°•à°¾à°°à±à°Ÿà±â€Œà°¨à± à°¸à°¿à°‚à°•à± à°šà±‡à°¯à°¡à°¾à°¨à°¿à°•à°¿ à°•à°¿à°¯à±‹à°¸à±à°•à± à°¸à±à°•à±à°°à±€à°¨à±â€Œà°ªà±ˆ à°‰à°¨à±à°¨ QR à°•à±‹à°¡à±â€Œà°¨à°¿ à°®à±€ à°«à±‹à°¨à±â€Œà°¤à±‹ à°¸à±à°•à°¾à°¨à± à°šà±‡à°¯à°‚à°¡à°¿.',
    3: 'à°¸à±†à°·à°¨à± à°•à°¨à±†à°•à±à°Ÿà± à°…à°¯à°¿à°‚à°¦à°¿. à°®à±€à°°à± à°à°²à± 2 à°²à±‹ à°‰à°¨à±à°¨à°¾à°°à±. à°•à±à°•à°¿à°‚à°—à± à°†à°¯à°¿à°²à± à°Žà°•à±à°•à°¡ à°¦à±Šà°°à±à°•à±à°¤à±à°‚à°¦à°¨à°¿ à°®à±€à°°à± à°…à°¡à°¿à°—à°¾à°°à±. à°«à°¾à°°à±à°šà±à°¯à±‚à°¨à± à°¸à°¨à±â€Œà°«à±à°²à°µà°°à± à°†à°¯à°¿à°²à± à°®à±€ à°•à±à°¡à°¿à°µà±ˆà°ªà± à°·à±†à°²à±à°«à± B2 à°²à±‹ à°‰à°‚à°¦à°¿. à°µà°¸à±à°¤à±à°µà± à°•à°¾à°°à±à°Ÿà±â€Œà°•à± à°œà±‹à°¡à°¿à°‚à°šà°¬à°¡à±à°¤à±‹à°‚à°¦à°¿.',
    4: 'à°·à°¾à°ªà°¿à°‚à°—à± à°ªà±‚à°°à±à°¤à°¯à°¿à°‚à°¦à°¿. à°¦à°¯à°šà±‡à°¸à°¿ à°§à±ƒà°µà±€à°•à°°à°£ à°•à±‹à°¸à°‚ à°•à°¿à°¯à±‹à°¸à±à°•à± 01 à°µà°¦à±à°¦à°•à± à°¤à°¿à°°à°¿à°—à°¿ à°°à°‚à°¡à°¿. à°†à°ªà±à°Ÿà°¿à°•à°²à± à°•à±†à°®à±†à°°à°¾ à°®à°°à°¿à°¯à± à°¬à°¾à°°à±â€Œà°•à±‹à°¡à± à°¸à±à°•à°¾à°¨à°°à± à°¯à°¾à°•à±à°Ÿà°¿à°µà±â€Œà°—à°¾ à°‰à°¨à±à°¨à°¾à°¯à°¿. à°…à°¨à±à°¨à°¿ à°µà°¸à±à°¤à±à°µà±à°²à± à°§à±ƒà°µà±€à°•à°°à°¿à°‚à°šà°¬à°¡à±à°¡à°¾à°¯à°¿.',
    5: 'à°•à°¾à°°à±à°Ÿà± à°§à±ƒà°µà±€à°•à°°à°¿à°‚à°šà°¬à°¡à°¿à°‚à°¦à°¿. à°•à°¿à°¯à±‹à°¸à±à°•à± 01 à°²à±‹ à°ªà±‡à°®à±†à°‚à°Ÿà± QR à°¸à±à°•à°¾à°¨à± à°šà±‡à°¯à°‚à°¡à°¿. à°®à±€ à°šà±†à°²à±à°²à°¿à°‚à°ªà± à°µà°¿à°œà°¯à°µà°‚à°¤à°®à±ˆà°‚à°¦à°¿. à°®à±€à°°à± à°¸à±à°Ÿà±‹à°°à± à°¨à±à°‚à°¡à°¿ à°¬à°¯à°Ÿà°•à± à°µà±†à°³à±à°³à°µà°šà±à°šà±. à°—à±à°°à±‹à°¸à°°à± à°à°à°¤à±‹ à°·à°¾à°ªà°¿à°‚à°—à± à°šà±‡à°¸à°¿à°¨à°‚à°¦à±à°•à± à°§à°¨à±à°¯à°µà°¾à°¦à°¾à°²à±.'
  },
  hi: {
    1: 'à¤—à¥à¤°à¥‹à¤¸à¤° à¤à¤†à¤ˆ, à¤¬à¥à¤°à¤¾à¤‚à¤š 104 à¤®à¥‡à¤‚ à¤†à¤ªà¤•à¤¾ à¤¸à¥à¤µà¤¾à¤—à¤¤ à¤¹à¥ˆà¥¤ à¤¸à¥à¤µà¤šà¤¾à¤²à¤¿à¤¤ à¤ªà¥à¤°à¤µà¥‡à¤¶ à¤¦à¥à¤µà¤¾à¤° à¤–à¥à¤² à¤—à¤ à¤¹à¥ˆà¤‚à¥¤ à¤•à¥ƒà¤ªà¤¯à¤¾ à¤…à¤‚à¤¦à¤° à¤•à¤¿à¤¯à¥‹à¤¸à¥à¤• 01 à¤ªà¤° à¤œà¤¾à¤à¤‚à¥¤',
    2: 'à¤•à¤¿à¤¯à¥‹à¤¸à¥à¤• 01 à¤®à¥‡à¤‚ à¤†à¤ªà¤•à¤¾ à¤¸à¥à¤µà¤¾à¤—à¤¤ à¤¹à¥ˆà¥¤ à¤¸à¤¤à¥à¤° SESS 104 à¤¶à¥à¤°à¥‚ à¤¹à¥‹ à¤—à¤¯à¤¾ à¤¹à¥ˆà¥¤ à¤…à¤ªà¤¨à¥‡ à¤²à¤¾à¤‡à¤µ à¤•à¤¾à¤°à¥à¤Ÿ à¤•à¥‹ à¤¸à¤¿à¤‚à¤• à¤•à¤°à¤¨à¥‡ à¤•à¥‡ à¤²à¤¿à¤ à¤•à¤¿à¤¯à¥‹à¤¸à¥à¤• à¤¸à¥à¤•à¥à¤°à¥€à¤¨ à¤ªà¤° à¤•à¥à¤¯à¥‚à¤†à¤° à¤•à¥‹à¤¡ à¤•à¥‹ à¤…à¤ªà¤¨à¥‡ à¤«à¥‹à¤¨ à¤¸à¥‡ à¤¸à¥à¤•à¥ˆà¤¨ à¤•à¤°à¥‡à¤‚à¥¤',
    3: 'à¤¸à¤¤à¥à¤° à¤•à¤¨à¥‡à¤•à¥à¤Ÿ à¤¹à¥‹ à¤—à¤¯à¤¾à¥¤ à¤†à¤ª à¤†à¤‡à¤² 2 à¤®à¥‡à¤‚ à¤¹à¥ˆà¤‚à¥¤ à¤†à¤ªà¤¨à¥‡ à¤ªà¥‚à¤›à¤¾: à¤•à¥à¤•à¤¿à¤‚à¤— à¤‘à¤¯à¤² à¤•à¤¹à¤¾à¤ à¤¹à¥ˆ? à¤«à¤¾à¤°à¥à¤šà¥à¤¯à¥‚à¤¨ à¤¸à¤¨à¤«à¥à¤²à¤¾à¤µà¤° à¤‘à¤¯à¤² à¤†à¤ªà¤•à¥€ à¤¦à¤¾à¤ˆà¤‚ à¤“à¤° à¤¶à¥‡à¤²à¥à¤« B2 à¤ªà¤° à¤¹à¥ˆà¥¤ à¤†à¤‡à¤Ÿà¤® à¤•à¤¾à¤°à¥à¤Ÿ à¤®à¥‡à¤‚ à¤œà¥‹à¤¡à¤¼à¤¾ à¤œà¤¾ à¤°à¤¹à¤¾ à¤¹à¥ˆà¥¤',
    4: 'à¤–à¤°à¥€à¤¦à¤¾à¤°à¥€ à¤ªà¥‚à¤°à¥€ à¤¹à¥à¤ˆà¥¤ à¤•à¥ƒà¤ªà¤¯à¤¾ à¤¸à¤¤à¥à¤¯à¤¾à¤ªà¤¨ à¤•à¥‡ à¤²à¤¿à¤ à¤•à¤¿à¤¯à¥‹à¤¸à¥à¤• 01 à¤ªà¤° à¤µà¤¾à¤ªà¤¸ à¤†à¤à¤‚à¥¤ à¤‘à¤ªà¥à¤Ÿà¤¿à¤•à¤² à¤•à¥ˆà¤®à¤°à¤¾ à¤”à¤° à¤¬à¤¾à¤°à¤•à¥‹à¤¡ à¤¸à¥à¤•à¥ˆà¤¨à¤° à¤¸à¤•à¥à¤°à¤¿à¤¯ à¤¹à¥ˆà¤‚à¥¤ à¤¸à¤­à¥€ à¤ªà¥ˆà¤•à¥‡à¤œà¥à¤¡ à¤†à¤‡à¤Ÿà¤® à¤”à¤° à¤ªà¥ˆà¤• à¤¸à¤¾à¤‡à¤œ à¤¸à¤¤à¥à¤¯à¤¾à¤ªà¤¿à¤¤ à¤¹à¥‹ à¤—à¤ à¤¹à¥ˆà¤‚à¥¤',
    5: 'à¤•à¤¾à¤°à¥à¤Ÿ à¤¸à¤¤à¥à¤¯à¤¾à¤ªà¤¿à¤¤ à¤¹à¥à¤†à¥¤ à¤•à¤¿à¤¯à¥‹à¤¸à¥à¤• 01 à¤ªà¤° à¤ªà¥‡à¤®à¥‡à¤‚à¤Ÿ à¤•à¥à¤¯à¥‚à¤†à¤° à¤¸à¥à¤•à¥ˆà¤¨ à¤•à¤°à¥‡à¤‚à¥¤ à¤†à¤ªà¤•à¤¾ à¤­à¥à¤—à¤¤à¤¾à¤¨ à¤¸à¤«à¤² à¤°à¤¹à¤¾à¥¤ à¤†à¤ª à¤¸à¥à¤Ÿà¥‹à¤° à¤¸à¥‡ à¤¬à¤¾à¤¹à¤° à¤œà¤¾ à¤¸à¤•à¤¤à¥‡ à¤¹à¥ˆà¤‚à¥¤ à¤—à¥à¤°à¥‹à¤¸à¤° à¤à¤†à¤ˆ à¤®à¥‡à¤‚ à¤–à¤°à¥€à¤¦à¤¾à¤°à¥€ à¤•à¥‡ à¤²à¤¿à¤ à¤§à¤¨à¥à¤¯à¤µà¤¾à¤¦à¥¤'
  }
};

const STORY_STAGES_BY_LANG: Record<LanguageCode, StoryStage[]> = {
  en: [
    {
      id: 1,
      stepNumber: '01',
      title: 'STORE ENTRANCE',
      badge: 'CUSTOMER ARRIVAL',
      badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-300',
      storyText:
        'Customer arrives at GrocerAI Branch #104. Automatic glass doors glide open, welcoming the shopper into the sunlit supermarket.',
      interactionPrompt: 'LiDAR presence verified â€¢ Doors opened',
      agentContext: 'Store Agent monitors arrival flow'
    },
    {
      id: 2,
      stepNumber: '02',
      title: 'KIOSK 01 & SESSION QR',
      badge: 'START SHOPPING',
      badgeColor: 'bg-blue-50 text-blue-800 border-blue-300',
      storyText:
        'Customer approaches physical retail Kiosk 01. Kiosk displays "START SHOPPING" with Session QR code. Customer scans and creates unified cart session SESS_104 on their phone.',
      interactionPrompt: 'Scan Session QR on Kiosk 01',
      agentContext: 'Store Agent initializes unified session SESS_104'
    },
    {
      id: 3,
      stepNumber: '03',
      title: 'AISLE SHOPPING & ALEXA+',
      badge: 'VOICE-GUIDED SHOPPING',
      badgeColor: 'bg-teal-50 text-teal-800 border-teal-300',
      storyText:
        'Shopper moves through Aisle 02 with their cart. Alexa+ responds with the oil location and lights a route to Shelf B2.',
      interactionPrompt: '“Where can I find cooking oil?” — Alexa+ guides to Shelf B2',
      agentContext: 'GrocerAI conversational shopper + Store Agent planogram sync'
    },
    {
      id: 4,
      stepNumber: '04',
      title: 'RETURN TO SAME KIOSK',
      badge: 'PHYSICAL SKU VERIFICATION',
      badgeColor: 'bg-amber-50 text-amber-800 border-amber-300',
      storyText:
        'Customer returns to the SAME Kiosk 01 with their cart. Overhead CV camera & barcode scanner verify pre-packaged items, SKU, and pack sizes on the bagging deck.',
      interactionPrompt: 'Physical verification: Tata Salt 1kg, Sunflower Oil 1L, Pasta 500g',
      agentContext: 'Security Agent verifies pack size & prevents mismatch'
    },
    {
      id: 5,
      stepNumber: '05',
      title: 'DEMO CHECKOUT & EXIT',
      badge: 'DEMO CHECKOUT COMPLETE',
      badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-300',
      storyText:
        'Cart verified with a 3-way match. A demo checkout QR is shown on Kiosk 01; the customer confirms the simulated checkout and exits.',
      interactionPrompt: 'Demo only. No real payment was made. You can exit the store.',
      agentContext: 'Hindsight records verified checkout events for continuous store calibration'
    }
  ],
  te: [
    {
      id: 1,
      stepNumber: '01',
      title: 'à°¸à±à°Ÿà±‹à°°à± à°ªà±à°°à°µà±‡à°¶ à°¦à±à°µà°¾à°°à°‚',
      badge: 'à°•à°¸à±à°Ÿà°®à°°à± à°°à°¾à°•',
      badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-300',
      storyText:
        'à°•à°¸à±à°Ÿà°®à°°à± à°—à±à°°à±‹à°¸à°°à± à°à° à°¬à±à°°à°¾à°‚à°šà± #104 à°µà°¦à±à°¦à°•à± à°šà±‡à°°à±à°•à±à°¨à±à°¨à°¾à°°à±. à°†à°Ÿà±‹à°®à±‡à°Ÿà°¿à°•à± à°—à±à°²à°¾à°¸à± à°¡à±‹à°°à±à°²à± à°¤à±†à°°à±à°šà±à°•à±à°¨à±à°¨à°¾à°¯à°¿.',
      interactionPrompt: 'à°²à±ˆà°¡à°¾à°°à± à°§à±ƒà°µà±€à°•à°°à°£ â€¢ à°ªà±à°°à°µà±‡à°¶ à°¦à±à°µà°¾à°°à°¾à°²à± à°¤à±†à°°à±à°šà±à°•à±à°¨à±à°¨à°¾à°¯à°¿',
      agentContext: 'à°¸à±à°Ÿà±‹à°°à± à°à°œà±†à°‚à°Ÿà± à°ªà±à°°à°µà±‡à°¶ à°ªà±à°°à°µà°¾à°¹à°¾à°¨à±à°¨à°¿ à°ªà°°à±à°¯à°µà±‡à°•à±à°·à°¿à°¸à±à°¤à±à°‚à°¦à°¿'
    },
    {
      id: 2,
      stepNumber: '02',
      title: 'à°•à°¿à°¯à±‹à°¸à±à°•à± 01 & à°¸à±†à°·à°¨à± QR',
      badge: 'à°·à°¾à°ªà°¿à°‚à°—à± à°ªà±à°°à°¾à°°à°‚à°­à°‚',
      badgeColor: 'bg-blue-50 text-blue-800 border-blue-300',
      storyText:
        'à°•à°¸à±à°Ÿà°®à°°à± à°•à°¿à°¯à±‹à°¸à±à°•à± 01 à°µà°¦à±à°¦à°•à± à°šà±‡à°°à±à°•à±à°¨à±à°¨à°¾à°°à±. à°¸à±à°•à±à°°à±€à°¨à±â€Œà°ªà±ˆ à°‰à°¨à±à°¨ à°¸à±†à°·à°¨à± QR à°•à±‹à°¡à±â€Œà°¨à°¿ à°«à±‹à°¨à±â€Œà°¤à±‹ à°¸à±à°•à°¾à°¨à± à°šà±‡à°¸à°¿ à°²à±ˆà°µà± à°•à°¾à°°à±à°Ÿà±â€Œà°¨à± à°•à°¨à±†à°•à±à°Ÿà± à°šà±‡à°¸à±à°¤à°¾à°°à±.',
      interactionPrompt: 'à°•à°¿à°¯à±‹à°¸à±à°•à± 01 à°²à±‹ à°¸à±†à°·à°¨à± QR à°¸à±à°•à°¾à°¨à± à°šà±‡à°¯à°‚à°¡à°¿',
      agentContext: 'à°¸à±à°Ÿà±‹à°°à± à°à°œà±†à°‚à°Ÿà± à°¸à±†à°·à°¨à± SESS_104à°¨à°¿ à°ªà±à°°à°¾à°°à°‚à°­à°¿à°¸à±à°¤à±à°‚à°¦à°¿'
    },
    {
      id: 3,
      stepNumber: '03',
      title: 'à°à°²à± à°·à°¾à°ªà°¿à°‚à°—à± & à°œà°¾à°°à±à°µà°¿à°¸à±',
      badge: 'à°µà°¾à°¯à°¿à°¸à±-à°—à±ˆà°¡à±†à°¡à± à°·à°¾à°ªà°¿à°‚à°—à±',
      badgeColor: 'bg-teal-50 text-teal-800 border-teal-300',
      storyText:
        'à°•à°¸à±à°Ÿà°®à°°à± à°•à°¾à°°à±à°Ÿà±â€Œà°¤à±‹ à°à°²à± 2 à°²à±‹ à°¨à°¡à±à°¸à±à°¤à±à°¨à±à°¨à°¾à°°à±. à°œà°¾à°°à±à°µà°¿à°¸à±: "à°µà°‚à°Ÿ à°¨à±‚à°¨à±† à°®à±€ à°•à±à°¡à°¿à°µà±ˆà°ªà± à°·à±†à°²à±à°«à± B2 à°²à±‹ à°‰à°‚à°¦à°¿" à°…à°¨à°¿ à°®à°¾à°°à±à°—à°¦à°°à±à°¶à°¨à°‚ à°šà±‡à°¸à±à°¤à±à°‚à°¦à°¿.',
      interactionPrompt: 'â€œà°•à±à°•à°¿à°‚à°—à± à°†à°¯à°¿à°²à± à°Žà°•à±à°•à°¡ à°‰à°‚à°¦à°¿?â€ â€” à°œà°¾à°°à±à°µà°¿à°¸à± à°·à±†à°²à±à°«à± B2à°•à°¿ à°¦à°¾à°°à°¿ à°šà±‚à°ªà±à°¤à±à°‚à°¦à°¿',
      agentContext: 'à°•à°¸à±à°Ÿà°®à°°à± à°à°œà±†à°‚à°Ÿà± (à°œà°¾à°°à±à°µà°¿à°¸à±) + à°¸à±à°Ÿà±‹à°°à± à°ªà±à°²à°¾à°¨à±‹à°—à±à°°à°¾à°®à± à°¸à°¿à°‚à°•à±'
    },
    {
      id: 4,
      stepNumber: '04',
      title: 'à°•à°¿à°¯à±‹à°¸à±à°•à± à°µà°¦à±à°¦ SKU à°§à±ƒà°µà±€à°•à°°à°£',
      badge: 'à°«à°¿à°œà°¿à°•à°²à± à°§à±ƒà°µà±€à°•à°°à°£',
      badgeColor: 'bg-amber-50 text-amber-800 border-amber-300',
      storyText:
        'à°•à°¸à±à°Ÿà°®à°°à± à°…à°¦à±‡ à°•à°¿à°¯à±‹à°¸à±à°•à± 01 à°µà°¦à±à°¦à°•à± à°¤à°¿à°°à°¿à°—à°¿ à°µà°šà±à°šà°¾à°°à±. à°“à°µà°°à±â€Œà°¹à±†à°¡à± à°•à±†à°®à±†à°°à°¾ & à°¬à°¾à°°à±â€Œà°•à±‹à°¡à± à°¸à±à°•à°¾à°¨à°°à± à°…à°¨à±à°¨à°¿ à°ªà±à°¯à°¾à°•à± à°šà±‡à°¸à°¿à°¨ à°µà°¸à±à°¤à±à°µà±à°²à°¨à± à°®à°°à°¿à°¯à± à°ªà°°à°¿à°®à°¾à°£à°¾à°²à°¨à± à°§à±ƒà°µà±€à°•à°°à°¿à°¸à±à°¤à°¾à°¯à°¿.',
      interactionPrompt: 'à°«à°¿à°œà°¿à°•à°²à± à°§à±ƒà°µà±€à°•à°°à°£: à°Ÿà°¾à°Ÿà°¾ à°¸à°¾à°²à±à°Ÿà± 1à°•à±‡à°œà±€, à°¸à°¨à±â€Œà°«à±à°²à°µà°°à± à°†à°¯à°¿à°²à± 1à°²à±€, à°ªà°¾à°¸à±à°¤à°¾ 500à°—à±à°°à°¾',
      agentContext: 'à°¸à±†à°•à±à°¯à±‚à°°à°¿à°Ÿà±€ à°à°œà±†à°‚à°Ÿà± SKU & à°ªà±à°¯à°¾à°•à± à°¸à±ˆà°œà±à°¨à± à°§à±ƒà°µà±€à°•à°°à°¿à°¸à±à°¤à±à°‚à°¦à°¿'
    },
    {
      id: 5,
      stepNumber: '05',
      title: 'à°•à°¿à°¯à±‹à°¸à±à°•à± à°šà±†à°²à±à°²à°¿à°‚à°ªà± & à°Žà°—à±à°œà°¿à°Ÿà±',
      badge: 'à°šà±†à°²à±à°²à°¿à°‚à°ªà± à°µà°¿à°œà°¯à°µà°‚à°¤à°‚',
      badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-300',
      storyText:
        'à°•à°¾à°°à±à°Ÿà± à°§à±ƒà°µà±€à°•à°°à°¿à°‚à°šà°¬à°¡à°¿à°‚à°¦à°¿. à°•à°¿à°¯à±‹à°¸à±à°•à± 01 à°²à±‹ UPI QR à°•à±‹à°¡à± à°¸à±à°•à°¾à°¨à± à°šà±‡à°¸à°¿ à°šà±†à°²à±à°²à°¿à°‚à°ªà± à°ªà±‚à°°à±à°¤à°¯à°¿à°‚à°¦à°¿. à°—à±‡à°Ÿà±à°²à± à°¤à±†à°°à±à°šà±à°•à±à°¨à±à°¨à°¾à°¯à°¿ à°®à°°à°¿à°¯à± à°•à°¸à±à°Ÿà°®à°°à± à°¬à°¯à°Ÿà°•à± à°µà±†à°³à±à°¤à°¾à°°à±.',
      interactionPrompt: 'à°®à±€ à°šà±†à°²à±à°²à°¿à°‚à°ªà± à°µà°¿à°œà°¯à°µà°‚à°¤à°®à±ˆà°‚à°¦à°¿ â€¢ à°®à±€à°°à± à°¸à±à°Ÿà±‹à°°à± à°¨à±à°‚à°¡à°¿ à°¬à°¯à°Ÿà°•à± à°µà±†à°³à±à°³à°µà°šà±à°šà±',
      agentContext: 'à°¹à°¿à°‚à°¡à±â€Œà°¸à±ˆà°Ÿà± à°¨à°¿à°°à°‚à°¤à°° à°¸à±à°Ÿà±‹à°°à± à°•à°¾à°²à°¿à°¬à±à°°à±‡à°·à°¨à± à°•à±‹à°¸à°‚ à°ˆà°µà±†à°‚à°Ÿà±â€Œà°¨à± à°°à°¿à°•à°¾à°°à±à°¡à± à°šà±‡à°¸à±à°¤à±à°‚à°¦à°¿'
    }
  ],
  hi: [
    {
      id: 1,
      stepNumber: '01',
      title: 'à¤¸à¥à¤Ÿà¥‹à¤° à¤ªà¥à¤°à¤µà¥‡à¤¶ à¤¦à¥à¤µà¤¾à¤°',
      badge: 'à¤—à¥à¤°à¤¾à¤¹à¤• à¤†à¤—à¤®à¤¨',
      badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-300',
      storyText:
        'à¤—à¥à¤°à¤¾à¤¹à¤• à¤—à¥à¤°à¥‹à¤¸à¤° à¤à¤†à¤ˆ à¤¬à¥à¤°à¤¾à¤‚à¤š #104 à¤ªà¤¹à¥à¤‚à¤šà¥‡à¥¤ à¤¸à¥à¤µà¤šà¤¾à¤²à¤¿à¤¤ à¤•à¤¾à¤‚à¤š à¤•à¥‡ à¤¦à¤°à¤µà¤¾à¤œà¥‡ à¤–à¥à¤²à¥‡ à¤”à¤° à¤—à¥à¤°à¤¾à¤¹à¤• à¤•à¤¾ à¤¸à¥à¤µà¤¾à¤—à¤¤ à¤•à¤¿à¤¯à¤¾à¥¤',
      interactionPrompt: 'LiDAR à¤‰à¤ªà¤¸à¥à¤¥à¤¿à¤¤à¤¿ à¤¸à¤¤à¥à¤¯à¤¾à¤ªà¤¿à¤¤ â€¢ à¤¦à¤°à¤µà¤¾à¤œà¥‡ à¤–à¥à¤²à¥‡',
      agentContext: 'à¤¸à¥à¤Ÿà¥‹à¤° à¤à¤œà¥‡à¤‚à¤Ÿ à¤†à¤—à¤®à¤¨ à¤ªà¥à¤°à¤µà¤¾à¤¹ à¤•à¥€ à¤¨à¤¿à¤—à¤°à¤¾à¤¨à¥€ à¤•à¤°à¤¤à¤¾ à¤¹à¥ˆ'
    },
    {
      id: 2,
      stepNumber: '02',
      title: 'à¤•à¤¿à¤¯à¥‹à¤¸à¥à¤• 01 à¤”à¤° à¤¸à¤¤à¥à¤° QR',
      badge: 'à¤–à¤°à¥€à¤¦à¤¾à¤°à¥€ à¤¶à¥à¤°à¥‚ à¤•à¤°à¥‡à¤‚',
      badgeColor: 'bg-blue-50 text-blue-800 border-blue-300',
      storyText:
        'à¤—à¥à¤°à¤¾à¤¹à¤• à¤•à¤¿à¤¯à¥‹à¤¸à¥à¤• 01 à¤ªà¤° à¤ªà¤¹à¥à¤‚à¤šà¥‡à¥¤ à¤•à¤¿à¤¯à¥‹à¤¸à¥à¤• à¤¸à¥à¤•à¥à¤°à¥€à¤¨ à¤ªà¤° à¤¸à¥‡à¤¶à¤¨ QR à¤•à¥‹à¤¡ à¤¦à¤¿à¤–à¤¾à¤ˆ à¤¦à¥‡à¤¤à¤¾ à¤¹à¥ˆà¥¤ à¤«à¥‹à¤¨ à¤¸à¥‡ à¤¸à¥à¤•à¥ˆà¤¨ à¤•à¤° à¤²à¤¾à¤‡à¤µ à¤•à¤¾à¤°à¥à¤Ÿ à¤•à¤¨à¥‡à¤•à¥à¤Ÿ à¤•à¤°à¥‡à¤‚à¥¤',
      interactionPrompt: 'à¤•à¤¿à¤¯à¥‹à¤¸à¥à¤• 01 à¤ªà¤° à¤¸à¥‡à¤¶à¤¨ QR à¤¸à¥à¤•à¥ˆà¤¨ à¤•à¤°à¥‡à¤‚',
      agentContext: 'à¤¸à¥à¤Ÿà¥‹à¤° à¤à¤œà¥‡à¤‚à¤Ÿ à¤à¤•à¥€à¤•à¥ƒà¤¤ à¤¸à¤¤à¥à¤° SESS_104 à¤¶à¥à¤°à¥‚ à¤•à¤°à¤¤à¤¾ à¤¹à¥ˆ'
    },
    {
      id: 3,
      stepNumber: '03',
      title: 'à¤†à¤‡à¤² à¤¶à¥‰à¤ªà¤¿à¤‚à¤— à¤”à¤° à¤œà¤¾à¤°à¥à¤µà¤¿à¤¸',
      badge: 'à¤µà¥‰à¤¯à¤¸-à¤¨à¤¿à¤°à¥à¤¦à¥‡à¤¶à¤¿à¤¤ à¤–à¤°à¥€à¤¦à¤¾à¤°à¥€',
      badgeColor: 'bg-teal-50 text-teal-800 border-teal-300',
      storyText:
        'à¤—à¥à¤°à¤¾à¤¹à¤• à¤•à¤¾à¤°à¥à¤Ÿ à¤•à¥‡ à¤¸à¤¾à¤¥ à¤†à¤‡à¤² 02 à¤®à¥‡à¤‚ à¤†à¤—à¥‡ à¤¬à¤¢à¤¼à¤¤à¥‡ à¤¹à¥ˆà¤‚à¥¤ à¤œà¤¾à¤°à¥à¤µà¤¿à¤¸ à¤®à¤¾à¤°à¥à¤—à¤¦à¤°à¥à¤¶à¤¨ à¤•à¤°à¤¤à¤¾ à¤¹à¥ˆ: "à¤•à¥à¤•à¤¿à¤‚à¤— à¤‘à¤¯à¤² à¤†à¤ªà¤•à¥€ à¤¦à¤¾à¤ˆà¤‚ à¤“à¤° à¤¶à¥‡à¤²à¥à¤« B2 à¤ªà¤° à¤¹à¥ˆà¥¤"',
      interactionPrompt: 'â€œà¤•à¥à¤•à¤¿à¤‚à¤— à¤‘à¤¯à¤² à¤•à¤¹à¤¾à¤ à¤¹à¥ˆ?â€ â€” à¤œà¤¾à¤°à¥à¤µà¤¿à¤¸ à¤¶à¥‡à¤²à¥à¤« B2 à¤•à¥€ à¤“à¤° à¤²à¥‡ à¤œà¤¾à¤¤à¤¾ à¤¹à¥ˆ',
      agentContext: 'à¤•à¤¸à¥à¤Ÿà¤®à¤° à¤à¤œà¥‡à¤‚à¤Ÿ (à¤œà¤¾à¤°à¥à¤µà¤¿à¤¸) + à¤¸à¥à¤Ÿà¥‹à¤° à¤ªà¥à¤²à¤¾à¤¨à¥‹à¤—à¥à¤°à¤¾à¤® à¤¸à¤¿à¤‚à¤•'
    },
    {
      id: 4,
      stepNumber: '04',
      title: 'à¤•à¤¿à¤¯à¥‹à¤¸à¥à¤• à¤ªà¤° SKU à¤¸à¤¤à¥à¤¯à¤¾à¤ªà¤¨',
      badge: 'à¤­à¥Œà¤¤à¤¿à¤• à¤¸à¤¤à¥à¤¯à¤¾à¤ªà¤¨',
      badgeColor: 'bg-amber-50 text-amber-800 border-amber-300',
      storyText:
        'à¤—à¥à¤°à¤¾à¤¹à¤• à¤‰à¤¸à¥€ à¤•à¤¿à¤¯à¥‹à¤¸à¥à¤• 01 à¤ªà¤° à¤µà¤¾à¤ªà¤¸ à¤†à¤¤à¥‡ à¤¹à¥ˆà¤‚à¥¤ à¤“à¤µà¤°à¤¹à¥‡à¤¡ à¤•à¥ˆà¤®à¤°à¤¾ à¤”à¤° à¤¬à¤¾à¤°à¤•à¥‹à¤¡ à¤¸à¥à¤•à¥ˆà¤¨à¤° à¤¸à¤­à¥€ à¤ªà¥ˆà¤•à¥‡à¤œà¥à¤¡ à¤†à¤‡à¤Ÿà¤® à¤”à¤° à¤ªà¥ˆà¤• à¤¸à¤¾à¤‡à¤œ à¤¸à¤¤à¥à¤¯à¤¾à¤ªà¤¿à¤¤ à¤•à¤°à¤¤à¥‡ à¤¹à¥ˆà¤‚à¥¤',
      interactionPrompt: 'à¤­à¥Œà¤¤à¤¿à¤• à¤¸à¤¤à¥à¤¯à¤¾à¤ªà¤¨: à¤Ÿà¤¾à¤Ÿà¤¾ à¤¨à¤®à¤• 1kg, à¤«à¥‰à¤°à¥à¤šà¥à¤¯à¥‚à¤¨ à¤¤à¥‡à¤² 1L, à¤ªà¤¾à¤¸à¥à¤¤à¤¾ 500g',
      agentContext: 'à¤¸à¥à¤°à¤•à¥à¤·à¤¾ à¤à¤œà¥‡à¤‚à¤Ÿ à¤ªà¥ˆà¤• à¤¸à¤¾à¤‡à¤œ à¤¸à¤¤à¥à¤¯à¤¾à¤ªà¤¿à¤¤ à¤•à¤°à¤¤à¤¾ à¤¹à¥ˆ'
    },
    {
      id: 5,
      stepNumber: '05',
      title: 'à¤•à¤¿à¤¯à¥‹à¤¸à¥à¤• à¤­à¥à¤—à¤¤à¤¾à¤¨ à¤”à¤° à¤¨à¤¿à¤•à¤¾à¤¸',
      badge: 'à¤­à¥à¤—à¤¤à¤¾à¤¨ à¤¸à¤«à¤²',
      badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-300',
      storyText:
        'à¤•à¤¾à¤°à¥à¤Ÿ à¤¸à¤¤à¥à¤¯à¤¾à¤ªà¤¿à¤¤ à¤¹à¥à¤†à¥¤ à¤•à¤¿à¤¯à¥‹à¤¸à¥à¤• 01 à¤ªà¤° à¤¯à¥‚à¤ªà¥€à¤†à¤ˆ à¤•à¥à¤¯à¥‚à¤†à¤° à¤¸à¥à¤•à¥ˆà¤¨ à¤•à¤° à¤­à¥à¤—à¤¤à¤¾à¤¨ à¤ªà¥‚à¤°à¤¾ à¤¹à¥à¤†à¥¤ à¤Ÿà¤°à¥à¤¨à¤¸à¥à¤Ÿà¤¾à¤‡à¤² à¤…à¤¨à¤²à¥‰à¤• à¤¹à¥à¤ à¤”à¤° à¤—à¥à¤°à¤¾à¤¹à¤• à¤¬à¤¾à¤¹à¤° à¤¨à¤¿à¤•à¤²à¥‡à¥¤',
      interactionPrompt: 'à¤†à¤ªà¤•à¤¾ à¤­à¥à¤—à¤¤à¤¾à¤¨ à¤¸à¤«à¤² à¤°à¤¹à¤¾ â€¢ à¤†à¤ª à¤¸à¥à¤Ÿà¥‹à¤° à¤¸à¥‡ à¤¬à¤¾à¤¹à¤° à¤œà¤¾ à¤¸à¤•à¤¤à¥‡ à¤¹à¥ˆà¤‚',
      agentContext: 'à¤¹à¤¾à¤‡à¤‚à¤¡à¤¸à¤¾à¤‡à¤Ÿ à¤¨à¤¿à¤°à¤‚à¤¤à¤° à¤¸à¥à¤§à¤¾à¤° à¤•à¥‡ à¤²à¤¿à¤ à¤šà¥‡à¤•à¤†à¤‰à¤Ÿ à¤‡à¤µà¥‡à¤‚à¤Ÿ à¤°à¤¿à¤•à¥‰à¤°à¥à¤¡ à¤•à¤°à¤¤à¤¾ à¤¹à¥ˆ'
    }
  ]
};

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { setRole, language, openEnterStore } = useApp();

  // 3D Canvas Stage State
  const [currentStage, setCurrentStage] = useState<StageId>(1);
  const [viewMode, setViewMode] = useState<AgentViewMode>('NORMAL');
  const [isAutoTour, setIsAutoTour] = useState(true);

  // Modals & Authentication
  const [getStartedOpen, setGetStartedOpen] = useState(false);
  const [getStartedRole, setGetStartedRole] = useState<'CUSTOMER' | 'EMPLOYEE' | 'MANAGER' | null>(null);

  // Audio Narration State (Real Voice Synthesis - One-Way Speech Narration)
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isAlexaSpeaking, setIsAlexaSpeaking] = useState(false);
  const [introDescended, setIntroDescended] = useState(false);

  const stages = STORY_STAGES_BY_LANG[language] || STORY_STAGES_BY_LANG.en;
  const activeStage = stages.find((s) => s.id === currentStage) || stages[0];

  // Subscribe to voiceService status
  useEffect(() => {
    const unsubscribe = voiceService.subscribeStatus((status) => {
      setIsAlexaSpeaking(status === 'speaking');
    });
    return () => {
      unsubscribe();
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Voice-Synchronized Auto-Tour: NEVER shifts in the middle of speech!
  // Speaks the stage narrative in active language (English, Telugu, Hindi), waits until speech completely completes, pauses naturally, then advances.
  useEffect(() => {
    if (!introDescended) return; // Wait until camera descends from digital twin and GrocerAI board appears

    let isCancelled = false;
    let transitionTimeout: any = null;

    const runStageNarrative = async () => {
      const script = (STAGE_VOICE_SCRIPTS[language] || STAGE_VOICE_SCRIPTS.en)[currentStage];

      if (voiceEnabled && script) {
        // Await speech completion so Alexa+ is never interrupted mid-sentence!
        await voiceService.speak(script, language);
      } else {
        // If voice is muted, linger for 7 seconds to read the narrative
        await new Promise((res) => setTimeout(res, 7000));
      }

      if (isCancelled) return;

      // Natural pause after speech before smoothly gliding to the next stage
      if (isAutoTour) {
        transitionTimeout = setTimeout(() => {
          if (isCancelled) return;
          setCurrentStage((prev) => ((prev % 5) + 1) as StageId);
        }, 2000);
      }
    };

    runStageNarrative();

    return () => {
      isCancelled = true;
      if (transitionTimeout) clearTimeout(transitionTimeout);
    };
  }, [currentStage, isAutoTour, voiceEnabled, introDescended, language]);

  const toggleVoice = () => {
    if (voiceEnabled) {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setVoiceEnabled(false);
    } else {
      setVoiceEnabled(true);
      const script = (STAGE_VOICE_SCRIPTS[language] || STAGE_VOICE_SCRIPTS.en)[currentStage];
      if (script && introDescended) {
        voiceService.speak(script, language);
      }
    }
  };

  const handleStageSelect = (stageId: StageId) => {
    setIsAutoTour(false);
    setCurrentStage(stageId);
  };

  const handleOpenRoleModal = (role?: 'CUSTOMER' | 'EMPLOYEE' | 'MANAGER') => {
    openEnterStore(role);
  };

  const handleManagerDashboard = () => {
    if (managerService.isAuthenticated()) {
      setRole('STORE_MANAGER');
      navigate('/store/dashboard');
    } else {
      navigate('/manager/login');
    }
  };

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)] bg-slate-100 text-slate-900 overflow-hidden select-none font-sans">
      {/* ===================================================================== */}
      {/* 1. REALISTIC 3D SUPERMARKET ENVIRONMENT (THE WEBSITE ITSELF)          */}
      {/* ===================================================================== */}
      <div className="absolute inset-0 z-0">
        <Store3DCanvas
          currentStage={currentStage}
          viewMode={viewMode}
          onStageChange={handleStageSelect}
          isAutoTour={isAutoTour}
          onIntroComplete={() => setIntroDescended(true)}
        />

        {/* Soft bottom vignette for reading story text while keeping the supermarket visible */}
        <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-slate-950/40 via-slate-900/10 to-transparent pointer-events-none" />
      </div>

      {/* ===================================================================== */}
      {/* 2. RESTRAINED TOP BRAND HEADER & MULTI-AGENT LENS (MINIMALIST)        */}
      {/* ===================================================================== */}
      <header className="absolute top-0 inset-x-0 z-20 px-4 sm:px-8 pt-3 sm:pt-4 flex flex-wrap items-center justify-between gap-3 pointer-events-auto">
        {/* Left: Physical Retail Badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/95 border border-slate-200/90 shadow-md backdrop-blur-md">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse" />
            <span className="text-xs font-mono font-black text-slate-900 tracking-wider">
              GROCERAI
            </span>
            <span className="text-xs font-mono text-emerald-700 font-bold">
              BRANCH #104
            </span>
          </div>

          <span className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 border border-slate-200/80 text-[11px] font-mono text-slate-700 shadow-sm backdrop-blur-md">
            <span>AUTONOMOUS SUPERMARKET</span>
          </span>
        </div>

        {/* Center: Invisible Intelligence Lenses */}
        <div className="flex items-center bg-white/95 border border-slate-200/90 rounded-2xl p-1 shadow-md backdrop-blur-md">
          <button
            onClick={() => setViewMode('NORMAL')}
            className={`px-3 py-1 rounded-xl text-[11px] font-mono font-bold transition-all cursor-pointer ${
              viewMode === 'NORMAL'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            SUPERMARKET
          </button>
          <button
            onClick={() => setViewMode('SECURITY')}
            className={`px-3 py-1 rounded-xl text-[11px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'SECURITY'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-red-700'
            }`}
          >
            <ShieldCheck className="w-3 h-3" />
            <span>SECURITY AGENT</span>
          </button>
          <button
            onClick={() => setViewMode('STORE')}
            className={`px-3 py-1 rounded-xl text-[11px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'STORE'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-blue-700'
            }`}
          >
            <Store className="w-3 h-3" />
            <span>STORE AGENT</span>
          </button>
          <button
            onClick={() => setViewMode('CUSTOMER')}
            className={`px-3 py-1 rounded-xl text-[11px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'CUSTOMER'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-teal-700'
            }`}
          >
            <Bot className="w-3 h-3" />
            <span>ALEXA+ SHOPPING</span>
          </button>
          <button
            onClick={() => setViewMode('HINDSIGHT')}
            className={`px-3 py-1 rounded-xl text-[11px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'HINDSIGHT'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-purple-700'
            }`}
          >
            <BrainCircuit className="w-3 h-3" />
            <span>HINDSIGHT</span>
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Assistant voice narration toggle */}
          <button
            onClick={toggleVoice}
            className={`px-3 py-1.5 rounded-2xl border text-xs font-mono font-bold transition-all shadow-md backdrop-blur-md flex items-center gap-1.5 cursor-pointer ${
              voiceEnabled
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-500/20'
                : 'bg-white/95 text-slate-700 border-slate-200 hover:text-slate-900'
            }`}
            title={voiceEnabled ? 'Mute Alexa+ narration' : 'Enable Alexa+ narration'}
          >
            {voiceEnabled ? (
              <>
                <Volume2 className="w-3.5 h-3.5 animate-pulse" />
                <span className="hidden sm:inline">ALEXA+ VOICE: ON</span>
                <span className="sm:hidden">VOICE</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                <span className="hidden sm:inline">ALEXA+ VOICE: MUTED</span>
                <span className="sm:hidden">MUTED</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* ===================================================================== */}
      {/* 3. INVISIBLE INTELLIGENCE SUBTLE STATUS BANNER (WHEN LENS ACTIVE)     */}
      {/* ===================================================================== */}
      {viewMode !== 'NORMAL' && (
        <div className="absolute top-16 inset-x-4 z-10 pointer-events-none flex justify-center animate-in fade-in slide-in-from-top-1">
          <div className="max-w-xl w-full px-4 py-2 rounded-2xl bg-white/95 border border-slate-200/90 shadow-lg backdrop-blur-md flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2 text-slate-800">
              {viewMode === 'SECURITY' && (
                <>
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  <span className="font-bold text-red-700">SECURITY AGENT:</span>
                  <span>Overhead CV monitoring aisles & checkout â€¢ 0 anomalies</span>
                </>
              )}
              {viewMode === 'STORE' && (
                <>
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                  <span className="font-bold text-blue-700">STORE AGENT:</span>
                  <span>Shelf inventory sync â€¢ Restock flow nominal â€¢ Kiosk 01 ready</span>
                </>
              )}
              {viewMode === 'CUSTOMER' && (
                <>
                  <span className="w-2 h-2 rounded-full bg-teal-500 animate-ping" />
                  <span className="font-bold text-teal-700">ALEXA+ SHOPPING:</span>
                  <span>Voice companion active â€¢ Basket linked to phone â€¢ Waypoints live</span>
                </>
              )}
              {viewMode === 'HINDSIGHT' && (
                <>
                  <span className="w-2 h-2 rounded-full bg-purple-500 animate-ping" />
                  <span className="font-bold text-purple-700">HINDSIGHT BRAIN:</span>
                  <span>Learning from checkout & customer events â€¢ Auto-calibrating rules</span>
                </>
              )}
            </div>
            <button
              onClick={() => setViewMode('NORMAL')}
              className="pointer-events-auto px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] cursor-pointer"
            >
              ESC
            </button>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 4. SUBTLE IN-WORLD CUSTOMER JOURNEY CARD (BOTTOM LEFT)                */}
      {/* ===================================================================== */}
      <div className="absolute bottom-16 sm:bottom-20 left-4 sm:left-8 z-10 max-w-lg pointer-events-none">
        <div className="p-4 sm:p-5 rounded-3xl bg-white/95 border border-slate-200/90 shadow-2xl backdrop-blur-xl space-y-2 pointer-events-auto">
          {/* Badge & Stage Indicator */}
          <div className="flex items-center justify-between">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold border ${activeStage.badgeColor}`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
              <span>{introDescended ? activeStage.badge : 'STORE DIGITAL TWIN'}</span>
            </span>

            <div className="flex items-center gap-2">
              {isAlexaSpeaking && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-cyan-50 border border-cyan-300 text-cyan-800 animate-pulse shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-ping" />
                  <span>ALEXA+ SPEAKING</span>
                </span>
              )}
              <span className="text-xs font-mono text-slate-600">
                {introDescended ? `STAGE ${activeStage.stepNumber} OF 05` : 'BRANCH #104 OVERVIEW'}
              </span>
            </div>
          </div>

          {/* Stage Headline & Narrative */}
          <div className="space-y-1">
            <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
              {introDescended ? activeStage.title : 'GROCERAI DIGITAL TWIN · BRANCH #104'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-normal">
              {introDescended
                ? activeStage.storyText
                : 'Gliding down from 3D digital twin overview to storefront entrance. Automatic sliding glass doors are opening...'}
            </p>
          </div>

          {/* Subtle Environmental Context Line */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-600">
            <span className="text-emerald-700 font-semibold truncate">
              {activeStage.interactionPrompt}
            </span>
            <span className="hidden sm:inline text-slate-600">
              {activeStage.agentContext}
            </span>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 5. MINIMALIST CHRONOLOGICAL SCRUBBER / CONTROLLER (BOTTOM BAR)        */}
      {/* ===================================================================== */}
      <div className="absolute bottom-3 sm:bottom-4 inset-x-4 sm:inset-x-8 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-auto">
        {/* Stages 1 to 5 Scrubber */}
        <div className="flex items-center gap-1.5 sm:gap-2 bg-white/95 border border-slate-200/90 rounded-2xl p-1.5 shadow-xl backdrop-blur-md">
          {/* Auto-Tour Toggle */}
          <button
            onClick={() => setIsAutoTour(!isAutoTour)}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              isAutoTour
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:text-slate-900'
            }`}
            title={isAutoTour ? 'Pause Tour' : 'Resume Auto-Tour'}
          >
            {isAutoTour ? (
              <>
                <Pause className="w-3 h-3 fill-white" />
                <span>TOUR ON</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3 fill-slate-700" />
                <span>PLAY</span>
              </>
            )}
          </button>

          {/* 5 Chronological Buttons */}
          {stages.map((s) => (
            <button
              key={s.id}
              onClick={() => handleStageSelect(s.id)}
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
                currentStage === s.id
                  ? 'bg-slate-900 text-white font-bold shadow-md'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span>{s.stepNumber}.</span>
              <span className="hidden md:inline">{s.title.split(' ')[0]}</span>
            </button>
          ))}
        </div>

        {/* Bottom Right Direct Live App Links */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <Link
            to="/mobile"
            className="px-3.5 py-1.5 rounded-2xl bg-white/95 border border-slate-200 text-slate-800 hover:text-teal-700 shadow-md backdrop-blur-md transition-all flex items-center gap-1.5 font-bold"
          >
            <Smartphone className="w-3.5 h-3.5 text-teal-600" />
            <span>[ MOBILE ]</span>
          </Link>
          <button
            onClick={handleManagerDashboard}
            className="px-3.5 py-1.5 rounded-2xl bg-white/95 border border-slate-200 text-slate-800 hover:text-purple-700 shadow-md backdrop-blur-md transition-all flex items-center gap-1.5 font-bold cursor-pointer"
          >
            <Bot className="w-3.5 h-3.5 text-purple-600" />
            <span>[ MANAGER HQ ]</span>
          </button>
        </div>
      </div>
    </div>
  );
};
