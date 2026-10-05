import {Composition, registerRoot} from 'remotion';
import {Ayn29Master} from './master';
import {film} from './config';
const Root = () => <Composition id="AYN29Master" component={Ayn29Master} durationInFrames={film.frames} fps={film.fps} width={film.width} height={film.height}/>;
registerRoot(Root);
