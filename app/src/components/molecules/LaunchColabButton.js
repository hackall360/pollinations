import {Button} from '@material-ui/core'
import { useEffect, useState } from 'react';

const colabURL = "https://colab.research.google.com/github/pollinations/pollinations/blob/dev/colabs/pollinator.ipynb";

const LaunchColabButton = ({ connected }) => {

    const [loading ,setLoading ] = useState(false)

    useEffect(()=>{
        if (connected) setLoading(false)

    },[connected])

    return !connected ? <Button 
        onClick={()=>setLoading(true)}
        color="secondary" 
        href={colabURL} 
        target="colab">
        {loading ? 'Launching...' : '[ Launch Colab ]'}
    </Button> : <></>
}

export default LaunchColabButton