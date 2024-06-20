import { useShare } from './useShare';

const Demo = () => {
  const { isSupported, share, isLoading } = useShare({
    title: 'Reactuse is awesome!',
    text: 'useShare too!'
  });

  const handleShareClick = () => {
    share()?.catch((err) => console.error(err));
  };

  return (
    <div>
      {isLoading && <p>Loading...</p>}
      <button type='button' disabled={isLoading || !isSupported} onClick={handleShareClick}>
        {isSupported ? 'Share' : 'Web share is not supported in your browser'}
      </button>
    </div>
  );
};

export default Demo;
