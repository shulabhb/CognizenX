import React from 'react';

import QuizScreen from './QuizScreen';

const TriviaScreen = ({ route, navigation }) => {
  const params = route?.params || {};
  const { category, subDomain, categories, selections } = params;

  const normalizedCategories =
    Array.isArray(categories) && categories.length > 0
      ? categories
      : category
        ? [category]
        : [];

  const mappedRoute = {
    ...route,
    params: {
      ...params,
      categories: normalizedCategories,
      subDomain: subDomain || null,
      selections: Array.isArray(selections) ? selections : [],
    },
  };

  return <QuizScreen route={mappedRoute} navigation={navigation} />;
};

export default TriviaScreen;
