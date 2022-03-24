import { useContext, useEffect, useState } from 'react';
import { createClient } from 'contentful-management';

import AuthView from '../AuthView';
import { LoginScreen } from './styles';
import Spinner from '../Spinner';
import { getFromLocalStorage, saveToLocalStorage } from '../../utils/storage';
import { store } from '../../providers/store';
import { PLOT } from '../../constants';
// import { useRouter } from 'next/router';

const Dashboard = ({ updateAppMode }) => {
  const globalState = useContext(store);
  const { dispatch } = globalState;
  const SPACE_ID = 'spaceId';
  const TOKEN = 'accessToken';
  const isDevMode = process.env.NODE_ENV === 'development';

  // const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isAutoSignIn, setIsAutoSignIn] = useState(false);
  const [fieldCreds, setFieldCreds] = useState({
    values: {
      [TOKEN]: isDevMode ? process.env.NEXT_PUBLIC_PERSONAL_ACCESS_TOKEN : defaultValue,
      [SPACE_ID]: isDevMode ? process.env.NEXT_PUBLIC_SPACE: defaultValue,
    },
    errors: {
      [TOKEN]: '',
      [SPACE_ID]: '',
    },
  });

  const handleChangeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const updatedCreds = {
      ...fieldCreds,
      values: {
        ...fieldCreds.values,
        [e.target.name]: e.target.value,        
      },
      errors: {
        [TOKEN]: '',
        [SPACE_ID]: '',
      },
    };

    setFieldCreds(updatedCreds);
  };

  // Load Axi SVG content from Contentful
  const fetchAxiSvgContent = async (space) => {
    setIsLoading(true);
    const fieldsToGet = ['title', 'description', 'thumbnail', 'svgFile'];
    const { items: entries } = await space.getEnvironment("master")
      .then((environment) =>
        environment.getEntries({
          content_type: 'axiSvgData',
          select: fieldsToGet.map(f => `fields.${f}`).join(',')
        })
      );
    
    const publishedEntries = entries.filter(item => item.isPublished());
    const { items: assets } = await space.getEnvironment("master")
      .then((environment) => environment.getAssets());
    
    // TODO: Add some error handling for the above API calls

    const entriesWithImageUrls = publishedEntries.map(item => {
      const thumbnailID = item.fields.thumbnail['en-US'].sys.id;
      const thumbnailAsset = assets.find(asset => asset.sys.id === thumbnailID);
      const svgID = item.fields.svgFile['en-US'].sys.id;
      const svgAsset = assets.find(asset => asset.sys.id === svgID);

      return ({
        description: item.fields.description['en-US'],
        title: item.fields.title['en-US'],
        images: {
          thumbnail: {
            id: thumbnailAsset?.sys.id,
            url: `https:${thumbnailAsset.fields.file['en-US'].url}`,
            fileName: thumbnailAsset?.fields.file['en-US'].fileName,
            width: thumbnailAsset?.fields.file['en-US'].details.image.width / 2,
            height: thumbnailAsset?.fields.file['en-US'].details.image.height / 2,
          },
          svg: {
            id: svgAsset?.sys.id,
            url: `https:${svgAsset.fields.file['en-US'].url}`,
            fileName: svgAsset?.fields.file['en-US'].fileName,
            width: svgAsset?.fields.file['en-US'].details.image.width,
            height: svgAsset?.fields.file['en-US'].details.image.height,
          }
        },
        uploadDate: item.sys.publishedAt,
      });
    });

    return entriesWithImageUrls;
  }

  const updateSignInErrors = (err) => {
    const errorObj = JSON.parse(err.message);
    let fieldErrorMessage;
    let fieldName;

    switch (errorObj.status) {
      case 404:
        fieldErrorMessage = 'Could not find this space ID';
        fieldName = SPACE_ID;
        break;
      case 401:
        fieldErrorMessage = 'This personal access token is not valid';
        fieldName = TOKEN;
        break;
      default:
        fieldErrorMessage = 'Unknown sign-in error';
        fieldName = SPACE_ID;    
    }

    // const errorFormatted = {
    //   [fieldName]: fieldErrorMessage,
    // };

    const updatedCreds = {
      ...fieldCreds,
      errors: {
        [fieldName]: fieldErrorMessage,
      },
    };

    setFieldCreds(updatedCreds);
  }

  const initClientFromInput = async (fieldCreds: Object) => {
    const accessToken = fieldCreds.values[TOKEN];
    const spaceId = fieldCreds.values[SPACE_ID];
    setIsSigningIn(true);

    try {
      const client = createClient({ accessToken });
      const space = await client.getSpace(spaceId);

      const user = await client.getCurrentUser();
      const { email, firstName, lastName, avatarUrl } = user;
      dispatch({
        type: 'SET_USER',
        payload: {
          data: { email, firstName, lastName, avatarUrl }
        },
      });

      saveToLocalStorage('contentfulCreds', { accessToken, spaceId });

      // 1. Authenticated! Now fetch Axi SVG Content
      const data = await fetchAxiSvgContent(space);

      // 2. Save content into local storage
      saveToLocalStorage('axiSvgContent', data);
      dispatch({
        type: 'SET_ENTRIES_DATA',
        payload: {
          data,
        },
      });

      // 3. Show the main app component
      updateAppMode(PLOT);
    } catch (err) {
      updateSignInErrors(err);
      setIsSigningIn(false);
      // throw err
    }
  
    return true
  }

  useEffect(() => {
    // THE CODE INSIDE THIS useEffect IS ALMOST IDENTICAL
    // TO THE CODE THAT RUNS WHEN USER CLICKS SIGN IN.
    // MAYBE THEY CAN BE CONSOLIDATED
    const initClientFromStoredCreds = async () => {
      // const credentialsLocalStorage = getCredentialsLocalStorage();
      const credentialsLocalStorage = getFromLocalStorage('contentfulCreds');
      if (!credentialsLocalStorage) {
        return;
      }

      setIsAutoSignIn(true);
      console.log('attempting auto sign-in');
      try {
        const { accessToken, spaceId } = credentialsLocalStorage;
        const client = createClient({ accessToken: accessToken });
        const space = await client.getSpace(spaceId);
        // console.log('Successfully signed in');
  
        const user = await client.getCurrentUser();
        const { email, firstName, lastName, avatarUrl } = user;
        dispatch({
          type: 'SET_USER',
          payload: {
            data: { email, firstName, lastName, avatarUrl }
          },
        });
        
        // saveToLocalStorage('contentfulCreds', { accessToken, spaceId });
        
        // 1. Authenticated! Now fetch Axi SVG Content
        const data = await fetchAxiSvgContent(space);
  
        // 2. Save content into local storage
        saveToLocalStorage('axiSvgContent', data);
        dispatch({
          type: 'SET_ENTRIES_DATA',
          payload: {
            data,
          },
        });
  
        // 3. Show the main app component
        updateAppMode(PLOT);
      } catch (err) {
        setIsAutoSignIn(false);
        console.error(err);
        console.log('auto sign-in failed');
      }
    
      return true
    }

    initClientFromStoredCreds();
  }, []);


  return (
    <>
      <LoginScreen>
        {isLoading || isAutoSignIn ? (
          <Spinner />
        ) : (
          <AuthView
            attemptSignIn={initClientFromInput}
            isSigningIn={isSigningIn}
            fieldCreds={fieldCreds}
            handleChangeInput={handleChangeInput}
          />
        )}
      </LoginScreen>
    </>
  );
};

export default Dashboard;
