/**
 * HiddenMediaElements Component
 * Hidden video elements used for media capture (camera and screen)
 */

import { RefObject } from 'react';

interface HiddenMediaElementsProps {
  videoRef: RefObject<HTMLVideoElement>;
  screenVideoRef: RefObject<HTMLVideoElement>;
}

export default function HiddenMediaElements({ 
  videoRef, 
  screenVideoRef 
}: HiddenMediaElementsProps) {
  return (
    <div className="hidden">
      <video ref={videoRef} autoPlay muted playsInline />
      <video ref={screenVideoRef} autoPlay muted playsInline />
    </div>
  );
}
