'use client';
import styled from 'styled-components';

/** Demo 1.dc.html 41행의 배경 스타일 원문. 좌표·색·별 위치·애니메이션 그대로. */
export function ProcessBackdrop({ isVisible, isFlat = false }: { isVisible: boolean; isFlat?: boolean }) {
  return <Backdrop $isVisible={isVisible} $isFlat={isFlat}>
    <Sky /><Drift><Stars /><Twinkles /></Drift>
    <ShootingOne /><ShootingTwo /><ShootingThree />
    {isVisible && <Sweep><Haze /><Rim data-preparation-floor /></Sweep>}
    <Body data-preparation-floor />{isVisible && !isFlat && <Sun data-sun="1" />}
  </Backdrop>;
}
const Backdrop = styled.div<{ $isVisible: boolean; $isFlat: boolean }>`
  position:absolute;left:0;top:0;width:1920px;height:1080px;overflow:hidden;pointer-events:none;opacity:${({ $isVisible }) => $isVisible ? 1 : 0};transition:opacity 1.2s ease;
  [data-preparation-floor] {
    ${({ $isFlat }) => $isFlat && 'border-radius: 0; top: var(--preparation-horizon,760px); transition: border-radius 1.5s cubic-bezier(.45,0,.2,1), var(--preparation-floor-transition,top 1.5s cubic-bezier(.45,0,.2,1));'}
  }

  @keyframes processHbSweep { from { -webkit-mask-position: 0% 0; mask-position: 0% 0; } to { -webkit-mask-position: 100% 0; mask-position: 100% 0; } }
  @keyframes processHbSun { from { opacity: 0; transform: scale(.55); } to { opacity: 1; transform: scale(1); } }
  @keyframes processHbDrift { from { transform: translate(0,0); } to { transform: translate(-70px,18px); } }
  @keyframes processHbTwinkle { from { opacity: .25; } to { opacity: 1; } }
  @keyframes processHbShoot { 0% { opacity: 0; transform: translate(0,0) rotate(155deg); } 1.5% { opacity: 1; } 9% { opacity: 0; transform: translate(-640px,300px) rotate(155deg); } 100% { opacity: 0; transform: translate(-640px,300px) rotate(155deg); } }
`;

const Sky = styled.div`
  position:absolute;inset:0;background:linear-gradient(180deg,#020203 0%,#070505 60%,#120804 100%);
`;

const Drift = styled.div`
  position:absolute;left:-80px;top:-40px;width:2080px;height:1120px;animation:processHbDrift 70s ease-in-out infinite alternate;
`;

const Stars = styled.div`
  position:absolute;inset:0;opacity:.95;background-image:radial-gradient(6px 6px at 35.8% 4.8%,rgba(255,236,220,.9) 0%,rgba(255,200,160,.25) 35%,transparent 100%),radial-gradient(6px 6px at 34.3% 53.0%,rgba(255,236,220,.9) 0%,rgba(255,200,160,.25) 35%,transparent 100%),radial-gradient(6px 6px at 70.8% 44.3%,rgba(255,236,220,.9) 0%,rgba(255,200,160,.25) 35%,transparent 100%),radial-gradient(6px 6px at 95.5% 47.2%,rgba(255,236,220,.9) 0%,rgba(255,200,160,.25) 35%,transparent 100%),radial-gradient(6px 6px at 20.7% 14.3%,rgba(255,236,220,.9) 0%,rgba(255,200,160,.25) 35%,transparent 100%),radial-gradient(6px 6px at 79.8% 6.2%,rgba(255,236,220,.9) 0%,rgba(255,200,160,.25) 35%,transparent 100%),radial-gradient(6px 6px at 91.6% 48.0%,rgba(255,236,220,.9) 0%,rgba(255,200,160,.25) 35%,transparent 100%),radial-gradient(6px 6px at 63.5% 42.7%,rgba(255,236,220,.9) 0%,rgba(255,200,160,.25) 35%,transparent 100%),radial-gradient(1.1px 1.1px at 0.0% 66.3%,#ffffff 50%,transparent 100%),radial-gradient(1.1px 1.1px at 72.9% 38.4%,#ffd9bd 50%,transparent 100%),radial-gradient(1.6px 1.6px at 75.5% 39.1%,#ffffff 50%,transparent 100%),radial-gradient(1.1px 1.1px at 81.7% 17.4%,#ffffff 50%,transparent 100%),radial-gradient(1.6px 1.6px at 69.8% 3.9%,#ffffff 50%,transparent 100%),radial-gradient(1.1px 1.1px at 92.2% 58.1%,#ffffff 50%,transparent 100%),radial-gradient(1.6px 1.6px at 92.3% 49.6%,#ffffff 50%,transparent 100%),radial-gradient(1.1px 1.1px at 91.2% 65.4%,#ffffff 50%,transparent 100%),radial-gradient(1.1px 1.1px at 83.7% 23.9%,#ffffff 50%,transparent 100%),radial-gradient(2.2px 2.2px at 42.8% 21.2%,#ffffff 50%,transparent 100%),radial-gradient(1.1px 1.1px at 72.9% 63.2%,#ffffff 50%,transparent 100%),radial-gradient(1.1px 1.1px at 56.1% 36.6%,#ffffff 50%,transparent 100%),radial-gradient(1.1px 1.1px at 90.9% 4.0%,#ffffff 50%,transparent 100%),radial-gradient(1.1px 1.1px at 66.4% 66.6%,#ffffff 50%,transparent 100%),radial-gradient(1.1px 1.1px at 40.6% 20.4%,#ffffff 50%,transparent 100%),radial-gradient(1.6px 1.6px at 33.3% 38.3%,#ffffff 50%,transparent 100%),radial-gradient(1.6px 1.6px at 90.6% 33.0%,#ffffff 50%,transparent 100%),radial-gradient(1.1px 1.1px at 63.4% 37.2%,#ffffff 50%,transparent 100%),radial-gradient(1.6px 1.6px at 94.0% 28.6%,#ffffff 50%,transparent 100%),radial-gradient(1.1px 1.1px at 58.7% 25.2%,#ffffff 50%,transparent 100%),radial-gradient(1.1px 1.1px at 79.5% 63.2%,#ffd9bd 50%,transparent 100%),radial-gradient(1.1px 1.1px at 7.8% 29.3%,#ffffff 50%,transparent 100%),radial-gradient(1.6px 1.6px at 99.6% 15.8%,#ffffff 50%,transparent 100%),radial-gradient(1.1px 1.1px at 45.7% 42.7%,#ffd9bd 50%,transparent 100%),radial-gradient(1.6px 1.6px at 88.5% 64.1%,#ffd9bd 50%,transparent 100%),radial-gradient(1.1px 1.1px at 76.1% 19.8%,#ffffff 50%,transparent 100%),radial-gradient(1.6px 1.6px at 7.6% 0.1%,#ffffff 50%,transparent 100%),radial-gradient(1.6px 1.6px at 74.1% 35.2%,#ffffff 50%,transparent 100%),radial-gradient(1.1px 1.1px at 88.2% 16.9%,#ffd9bd 50%,transparent 100%),radial-gradient(1.1px 1.1px at 11.8% 35.2%,#ffd9bd 50%,transparent 100%),radial-gradient(1.1px 1.1px at 63.7% 66.4%,#ffd9bd 50%,transparent 100%),radial-gradient(1.1px 1.1px at 18.8% 69.7%,#ffffff 50%,transparent 100%),radial-gradient(1.1px 1.1px at 26.6% 16.0%,#ffffff 50%,transparent 100%),radial-gradient(1.6px 1.6px at 5.2% 55.4%,#ffffff 50%,transparent 100%),radial-gradient(1.1px 1.1px at 49.8% 2.4%,#ffd9bd 50%,transparent 100%),radial-gradient(1.6px 1.6px at 13.1% 49.5%,#ffffff 50%,transparent 100%),radial-gradient(2.2px 2.2px at 88.3% 62.0%,#ffd9bd 50%,transparent 100%),radial-gradient(1.1px 1.1px at 76.5% 30.2%,#ffffff 50%,transparent 100%),radial-gradient(1.1px 1.1px at 88.2% 28.7%,#ffffff 50%,transparent 100%),radial-gradient(1.1px 1.1px at 88.7% 40.2%,#ffffff 50%,transparent 100%),radial-gradient(1.6px 1.6px at 73.5% 24.1%,#ffffff 50%,transparent 100%),radial-gradient(2.2px 2.2px at 19.9% 22.4%,#ffd9bd 50%,transparent 100%),radial-gradient(2.2px 2.2px at 63.2% 62.8%,#ffffff 50%,transparent 100%),radial-gradient(1.1px 1.1px at 64.5% 9.7%,#ffffff 50%,transparent 100%),radial-gradient(1.1px 1.1px at 77.1% 68.1%,#ffffff 50%,transparent 100%),radial-gradient(1.6px 1.6px at 44.7% 12.0%,#ffffff 50%,transparent 100%),radial-gradient(1.6px 1.6px at 56.2% 36.5%,#ffffff 50%,transparent 100%),radial-gradient(1.1px 1.1px at 75.1% 1.9%,#ffffff 50%,transparent 100%),radial-gradient(1.1px 1.1px at 20.3% 52.1%,#ffffff 50%,transparent 100%),radial-gradient(1.1px 1.1px at 66.0% 30.9%,#ffd9bd 50%,transparent 100%),radial-gradient(2.2px 2.2px at 82.3% 65.9%,#ffffff 50%,transparent 100%),radial-gradient(1.6px 1.6px at 95.9% 1.8%,#ffffff 50%,transparent 100%),radial-gradient(1.1px 1.1px at 72.4% 64.7%,#ffffff 50%,transparent 100%),radial-gradient(1.1px 1.1px at 8.0% 7.8%,#ffffff 50%,transparent 100%),radial-gradient(1.1px 1.1px at 60.5% 68.1%,#ffffff 50%,transparent 100%),radial-gradient(1.1px 1.1px at 20.2% 48.6%,#ffffff 50%,transparent 100%),radial-gradient(1.6px 1.6px at 99.4% 30.4%,#ffd9bd 50%,transparent 100%),radial-gradient(1.1px 1.1px at 39.7% 30.0%,#ffffff 50%,transparent 100%),radial-gradient(1.1px 1.1px at 80.8% 70.2%,#ffd9bd 50%,transparent 100%),radial-gradient(1.1px 1.1px at 50.9% 8.8%,#ffffff 50%,transparent 100%),radial-gradient(1.1px 1.1px at 17.1% 5.6%,#ffffff 50%,transparent 100%),radial-gradient(2.2px 2.2px at 55.6% 34.6%,#ffffff 50%,transparent 100%),radial-gradient(1.1px 1.1px at 41.3% 22.6%,#ffffff 50%,transparent 100%),radial-gradient(1.1px 1.1px at 41.3% 6.6%,#ffd9bd 50%,transparent 100%),radial-gradient(1.1px 1.1px at 77.7% 55.0%,#ffd9bd 50%,transparent 100%),radial-gradient(1.6px 1.6px at 96.2% 57.7%,#ffffff 50%,transparent 100%),radial-gradient(1.1px 1.1px at 34.8% 29.3%,#ffffff 50%,transparent 100%),radial-gradient(1.6px 1.6px at 56.7% 52.0%,#ffffff 50%,transparent 100%),radial-gradient(1.6px 1.6px at 72.9% 63.7%,#ffd9bd 50%,transparent 100%),radial-gradient(2.2px 2.2px at 43.8% 35.1%,#ffd9bd 50%,transparent 100%);
`;

const Twinkles = styled.div`
  position:absolute;inset:0;background-image:radial-gradient(5px 5px at 0.0% 4.8%,rgba(255,240,225,1) 0%,rgba(255,200,160,.3) 40%,transparent 100%),radial-gradient(5px 5px at 42.4% 13.5%,rgba(255,240,225,1) 0%,rgba(255,200,160,.3) 40%,transparent 100%),radial-gradient(5px 5px at 51.6% 48.8%,rgba(255,240,225,1) 0%,rgba(255,200,160,.3) 40%,transparent 100%),radial-gradient(5px 5px at 45.8% 2.8%,rgba(255,240,225,1) 0%,rgba(255,200,160,.3) 40%,transparent 100%),radial-gradient(5px 5px at 5.8% 60.5%,rgba(255,240,225,1) 0%,rgba(255,200,160,.3) 40%,transparent 100%),radial-gradient(5px 5px at 88.9% 6.3%,rgba(255,240,225,1) 0%,rgba(255,200,160,.3) 40%,transparent 100%),radial-gradient(5px 5px at 76.0% 4.4%,rgba(255,240,225,1) 0%,rgba(255,200,160,.3) 40%,transparent 100%),radial-gradient(5px 5px at 65.7% 26.1%,rgba(255,240,225,1) 0%,rgba(255,200,160,.3) 40%,transparent 100%),radial-gradient(5px 5px at 80.6% 14.8%,rgba(255,240,225,1) 0%,rgba(255,200,160,.3) 40%,transparent 100%),radial-gradient(5px 5px at 88.6% 4.5%,rgba(255,240,225,1) 0%,rgba(255,200,160,.3) 40%,transparent 100%),radial-gradient(5px 5px at 94.2% 18.0%,rgba(255,240,225,1) 0%,rgba(255,200,160,.3) 40%,transparent 100%),radial-gradient(5px 5px at 25.8% 52.3%,rgba(255,240,225,1) 0%,rgba(255,200,160,.3) 40%,transparent 100%),radial-gradient(5px 5px at 23.1% 20.8%,rgba(255,240,225,1) 0%,rgba(255,200,160,.3) 40%,transparent 100%),radial-gradient(5px 5px at 85.1% 16.8%,rgba(255,240,225,1) 0%,rgba(255,200,160,.3) 40%,transparent 100%);animation:processHbTwinkle 3.6s ease-in-out infinite alternate;
`;

const ShootingOne = styled.div`
  position:absolute;left:1500px;top:90px;width:240px;height:2px;border-radius:2px;background:linear-gradient(90deg,rgba(255,220,190,0) 0%,rgba(255,200,150,.5) 60%,#fff 100%);box-shadow:0 0 6px rgba(255,200,160,.8);opacity:0;animation:processHbShoot 9s linear 1.5s infinite;
`;

const ShootingTwo = styled.div`
  position:absolute;left:1180px;top:210px;width:240px;height:2px;border-radius:2px;background:linear-gradient(90deg,rgba(255,220,190,0) 0%,rgba(255,200,150,.5) 60%,#fff 100%);box-shadow:0 0 6px rgba(255,200,160,.8);opacity:0;animation:processHbShoot 13s linear 5s infinite;
`;

const ShootingThree = styled.div`
  position:absolute;left:900px;top:60px;width:240px;height:2px;border-radius:2px;background:linear-gradient(90deg,rgba(255,220,190,0) 0%,rgba(255,200,150,.5) 60%,#fff 100%);box-shadow:0 0 6px rgba(255,200,160,.8);opacity:0;animation:processHbShoot 17s linear 9.5s infinite;
`;

const Sweep = styled.div`
  position:absolute;inset:0;-webkit-mask-image:linear-gradient(90deg,transparent 0%,transparent 33%,#000 66%,#000 100%);mask-image:linear-gradient(90deg,transparent 0%,transparent 33%,#000 66%,#000 100%);-webkit-mask-size:300% 100%;mask-size:300% 100%;-webkit-mask-position:0% 0;mask-position:0% 0;animation:processHbSweep 6s cubic-bezier(.45,0,.35,1) .2s forwards;
`;

const Haze = styled.div`
  position:absolute;inset:0;background:radial-gradient(ellipse 80% 55% at 50% 84%,rgba(243,115,33,.30) 0%,rgba(120,46,10,.16) 45%,transparent 75%);
`;

const Rim = styled.div`
  position:absolute;left:-840px;top:880px;width:3600px;height:3600px;border-radius:50%;box-shadow:0 -1px 2px rgba(255,214,180,.7),0 -8px 30px rgba(255,160,90,.45),0 -40px 120px rgba(243,115,33,.3),0 -140px 300px rgba(243,115,33,.14);
`;

const Body = styled.div`
  position:absolute;left:-840px;top:880px;width:3600px;height:3600px;border-radius:50%;background:radial-gradient(circle at 50% 0%,#0d0a09 0%,#050404 30%,#020202 60%);
`;

const Sun = styled.div`
  position:absolute;left:560px;top:620px;width:800px;height:520px;background:radial-gradient(ellipse 50% 50% at 50% 50%,rgba(255,236,212,.75) 0%,rgba(255,180,110,.42) 9%,rgba(243,115,33,.2) 28%,rgba(243,115,33,.06) 50%,transparent 70%);mix-blend-mode:screen;filter:blur(8px);opacity:0;animation:processHbSun 3s ease-out 3.4s forwards;
`;
