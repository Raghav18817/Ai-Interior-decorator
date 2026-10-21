import { DeviceSpec } from '../types/devices'

/**
 * Standard electronic and audio-visual device dimensions.
 * Viewing distances based on THX & SMPTE cinema standards.
 */
export const STANDARD_DEVICES: DeviceSpec[] = [
  {
    id: 'dev_tv_55',
    name: '55-inch Smart TV',
    category: 'television',
    widthM: 1.23,
    heightM: 0.71,
    depthM: 0.07,
    recommendedViewingDistanceM: { min: 1.7, max: 2.3 },
    mountType: 'wall_mount'
  },
  {
    id: 'dev_tv_65',
    name: '65-inch Smart TV',
    category: 'television',
    widthM: 1.45,
    heightM: 0.83,
    depthM: 0.08,
    recommendedViewingDistanceM: { min: 2.0, max: 2.8 },
    mountType: 'wall_mount'
  },
  {
    id: 'dev_soundbar',
    name: 'Dolby Atmos Soundbar',
    category: 'audio',
    widthM: 0.95,
    heightM: 0.07,
    depthM: 0.12,
    mountType: 'surface_mount',
    requiresSurfaceBelow: true
  },
  {
    id: 'dev_console',
    name: 'Next-Gen Gaming Console',
    category: 'gaming',
    widthM: 0.39,
    heightM: 0.10,
    depthM: 0.26,
    mountType: 'surface_mount',
    requiresSurfaceBelow: true
  },
  {
    id: 'dev_monitor',
    name: 'Desktop Workstation & Monitor',
    category: 'computing',
    widthM: 0.82,
    heightM: 0.48,
    depthM: 0.25,
    recommendedViewingDistanceM: { min: 0.6, max: 0.9 },
    mountType: 'surface_mount',
    requiresSurfaceBelow: true
  },
  {
    id: 'dev_router',
    name: 'Wi-Fi 6 Router',
    category: 'network',
    widthM: 0.25,
    heightM: 0.18,
    depthM: 0.16,
    mountType: 'surface_mount'
  },
  {
    id: 'dev_speakers',
    name: 'Stereo Hi-Fi Bookshelf Speakers',
    category: 'audio',
    widthM: 0.20,
    heightM: 0.32,
    depthM: 0.22,
    mountType: 'surface_mount'
  }
]
