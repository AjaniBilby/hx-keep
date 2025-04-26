# React Example

Since my github pages setup doesn't support client side react you will have to make do with code examples.
Apologies.


## Loading State from `hx-keep`
```tsx

const self = useRef<HTMLDivElement>(null);
const [ state, setState ] = useState({});

const save = () => hx_keep.setValue(self.current, "_"+props.name, JSON.stringify(state));

useEffect({
  const data = hx_keep.getValue(self.current, "_"+props.name); // get my _timer string from the form
  if (!data) return;

  setState(JSON.parse(data));
}, []);

return <div ref={self}></div>;
```