import { useStopwatch } from './useStopwatch';

const Demo = () => {
  const { seconds, minutes, start, pause, reset } = useStopwatch();

  return (
    <div className='App'>
      <div>
        <span>{minutes}</span>:<span>{seconds}</span>
      </div>
      <button onClick={start}>Start</button>
      <button onClick={pause}>Pause</button>
      <button onClick={reset}>Reset</button>
    </div>
  );
};

export default Demo;
