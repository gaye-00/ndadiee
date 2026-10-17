// Logos des technologies, tirés de Simple Icons (licence CC0). Les marques appartiennent à leurs
// propriétaires : un logo sert seulement à nommer la technologie, en une couleur, sans le modifier.
// Un import par logo : seuls les dessins utilisés entrent dans le build. Pour en ajouter un, son nom
// de fichier dans node_modules/simple-icons/icons.
import arduino from 'simple-icons/icons/arduino.svg?raw';
import cypress from 'simple-icons/icons/cypress.svg?raw';
import dart from 'simple-icons/icons/dart.svg?raw';
import docker from 'simple-icons/icons/docker.svg?raw';
import espressif from 'simple-icons/icons/espressif.svg?raw';
import figma from 'simple-icons/icons/figma.svg?raw';
import firebase from 'simple-icons/icons/firebase.svg?raw';
import flutter from 'simple-icons/icons/flutter.svg?raw';
import github from 'simple-icons/icons/github.svg?raw';
import go from 'simple-icons/icons/go.svg?raw';
import graphql from 'simple-icons/icons/graphql.svg?raw';
import junit5 from 'simple-icons/icons/junit5.svg?raw';
import keycloak from 'simple-icons/icons/keycloak.svg?raw';
import kotlin from 'simple-icons/icons/kotlin.svg?raw';
import kubernetes from 'simple-icons/icons/kubernetes.svg?raw';
import laravel from 'simple-icons/icons/laravel.svg?raw';
import letsencrypt from 'simple-icons/icons/letsencrypt.svg?raw';
import markdown from 'simple-icons/icons/markdown.svg?raw';
import micropython from 'simple-icons/icons/micropython.svg?raw';
import nodedotjs from 'simple-icons/icons/nodedotjs.svg?raw';
import notion from 'simple-icons/icons/notion.svg?raw';
import openjdk from 'simple-icons/icons/openjdk.svg?raw';
import owasp from 'simple-icons/icons/owasp.svg?raw';
import pandas from 'simple-icons/icons/pandas.svg?raw';
import penpot from 'simple-icons/icons/penpot.svg?raw';
import postgresql from 'simple-icons/icons/postgresql.svg?raw';
import python from 'simple-icons/icons/python.svg?raw';
import pytorch from 'simple-icons/icons/pytorch.svg?raw';
import react from 'simple-icons/icons/react.svg?raw';
import redis from 'simple-icons/icons/redis.svg?raw';
import springboot from 'simple-icons/icons/springboot.svg?raw';
import svelte from 'simple-icons/icons/svelte.svg?raw';
import terraform from 'simple-icons/icons/terraform.svg?raw';
import trello from 'simple-icons/icons/trello.svg?raw';
import vitest from 'simple-icons/icons/vitest.svg?raw';
import vuedotjs from 'simple-icons/icons/vuedotjs.svg?raw';

const sources = {
  arduino,
  cypress,
  dart,
  docker,
  espressif,
  figma,
  firebase,
  flutter,
  github,
  go,
  graphql,
  junit5,
  keycloak,
  kotlin,
  kubernetes,
  laravel,
  letsencrypt,
  markdown,
  micropython,
  nodedotjs,
  notion,
  openjdk,
  owasp,
  pandas,
  penpot,
  postgresql,
  python,
  pytorch,
  react,
  redis,
  springboot,
  svelte,
  terraform,
  trello,
  vitest,
  vuedotjs,
};

export type StackLogoId = keyof typeof sources;

/** Tracé de chaque logo, dans un carré de 24 × 24 (shared/StackLogo.tsx). */
export const stackLogoPaths = Object.fromEntries(
  Object.entries(sources).map(([id, svg]) => [id, / d="([^"]+)"/.exec(svg)?.[1] ?? '']),
) as Record<StackLogoId, string>;
