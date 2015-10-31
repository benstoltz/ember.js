import Registry from 'container/registry';
import { runAppend, runDestroy } from 'ember-runtime/tests/utils';
import ComponentLookup from 'ember-views/component_lookup';
import Component from 'ember-views/components/component';
import compile from 'ember-template-compiler/system/compile';
import run from 'ember-metal/run_loop';
import isEnabled from 'ember-metal/features';

let component, registry, container;

if (isEnabled('ember-contextual-components')) {
  QUnit.module('ember-htmlbars: closure component helper', {
    setup() {
      registry = new Registry();
      container = registry.container();

      registry.optionsForType('template', { instantiate: false });
      registry.register('component-lookup:main', ComponentLookup);
    },

    teardown() {
      runDestroy(component);
      runDestroy(container);
      registry = container = component = null;
    }
  });

  QUnit.test('renders with component helper', function() {
    let expectedText = 'Hodi';
    registry.register(
      'template:components/-looked-up',
      compile(expectedText)
    );

    let template = compile('{{component (component "-looked-up")}}');
    component = Component.extend({ container, template }).create();

    runAppend(component);
    equal(component.$().text(), expectedText, '-looked-up component rendered');
  });

  QUnit.test('renders with component helper with invocation params, hash', function() {
    let LookedUp = Component.extend();
    LookedUp.reopenClass({
      positionalParams: ['name']
    });
    registry.register(
      'component:-looked-up',
      LookedUp
    );
    registry.register(
      'template:components/-looked-up',
      compile(`{{greeting}} {{name}}`)
    );

    let template = compile(
      `{{component (component "-looked-up") "Hodari" greeting="Hodi"}}`
    );
    component = Component.extend({ container, template }).create();

    runAppend(component);
    equal(component.$().text(), 'Hodi Hodari', '-looked-up component rendered');
  });

  QUnit.test('renders with component helper with curried params, hash', function() {
    let LookedUp = Component.extend();
    LookedUp.reopenClass({
      positionalParams: ['name']
    });
    registry.register(
      'component:-looked-up',
      LookedUp
    );
    registry.register(
      'template:components/-looked-up',
      compile(`{{greeting}} {{name}}`)
    );

    let template = compile(
      `{{component (component "-looked-up" "Hodari" greeting="Hodi") greeting="Hola"}}`
    );
    component = Component.extend({ container, template }).create();

    runAppend(component);
    equal(component.$().text(), 'Hola Hodari', '-looked-up component rendered');
  });

  QUnit.test('updates when component path is bound', function() {
    let Mandarin = Component.extend();
    registry.register(
      'component:-mandarin',
      Mandarin
    );
    registry.register(
      'template:components/-mandarin',
      compile(`ni hao`)
    );
    registry.register(
      'template:components/-hindi',
      compile(`Namaste`)
    );

    let template = compile('{{component (component lookupComponent)}}');
    component = Component.extend({
      container,
      template,
      lookupComponent: '-mandarin'
    }).create();

    runAppend(component);

    equal(component.$().text(), `ni hao`,
          'mandarin lookupComponent renders greeting');
    run(() => {
      component.set('lookupComponent', '-hindi');
    });
    equal(component.$().text(), `Namaste`,
          'hindi lookupComponent renders greeting');
  });

  QUnit.test('updates when curried hash argument is bound', function() {
    registry.register(
      'template:components/-looked-up',
      compile(`{{greeting}}`)
    );

    let template = compile(
      `{{component (component "-looked-up" greeting=greeting)}}`
    );
    component = Component.extend({ container, template }).create();

    runAppend(component);
    equal(component.$().text(), '', '-looked-up component rendered');
    run(() => {
      component.set('greeting', 'Hodi');
    });
    equal(component.$().text(), `Hodi`,
          'greeting is bound');
  });

  QUnit.test('nested components overwrites named positional parameters', function() {
    let LookedUp = Component.extend();
    LookedUp.reopenClass({
      positionalParams: ['name', 'age']
    });
    registry.register(
      'component:-looked-up',
      LookedUp
    );
    registry.register(
      'template:components/-looked-up',
      compile(`{{name}} {{age}}`)
    );

    let template = compile(
      `{{component
          (component (component "-looked-up" "Sergio" 28)
                     "Marvin" 21)
          "Hodari"}}`
    );
    component = Component.extend({ container, template }).create();

    runAppend(component);
    equal(component.$().text(), 'Hodari 21', '-looked-up component rendered');
  });

  QUnit.test('nested components overwrites hash parameters', function() {
    registry.register(
      'template:components/-looked-up',
      compile(`{{greeting}} {{name}} {{age}}`)
    );

    let template = compile(
      `{{component (component (component "-looked-up"
                                  greeting="Hola" name="Dolores" age=33)
                              greeting="Hej" name="Sigmundur")
                    greeting=greeting}}`
    );
    component = Component.extend({ container, template, greeting: 'Hodi' }).create();

    runAppend(component);

    equal(component.$().text(), 'Hodi Sigmundur 33', '-looked-up component rendered');
  });

  QUnit.test('bound outer named parameters get updated in the right scope', function() {
    let InnerComponent = Component.extend();
    InnerComponent.reopenClass({
      positionalParams: ['comp']
    });
    registry.register(
      'component:-inner-component',
      InnerComponent
    );
    registry.register(
      'template:components/-inner-component',
      compile(`{{component comp "Inner"}}`)
    );

    let LookedUp = Component.extend();
    LookedUp.reopenClass({
      positionalParams: ['name', 'age']
    });
    registry.register(
      'component:-looked-up',
      LookedUp
    );
    registry.register(
      'template:components/-looked-up',
      compile(`{{name}} {{age}}`)
    );

    let template = compile(
      `{{component "-inner-component" (component "-looked-up" outerName outerAge)}}`
    );
    component = Component.extend({
      container,
      template,
      outerName: 'Outer',
      outerAge: 28
    }).create();

    runAppend(component);
    equal(component.$().text(), 'Inner 28', '-looked-up component rendered');
  });

  QUnit.test('bound outer hash parameters get updated in the right scope', function() {
    let InnerComponent = Component.extend();
    InnerComponent.reopenClass({
      positionalParams: ['comp']
    });
    registry.register(
      'component:-inner-component',
      InnerComponent
    );
    registry.register(
      'template:components/-inner-component',
      compile(`{{component comp name="Inner"}}`)
    );

    let LookedUp = Component.extend();
    LookedUp.reopenClass({
    });
    registry.register(
      'component:-looked-up',
      LookedUp
    );
    registry.register(
      'template:components/-looked-up',
      compile(`{{name}} {{age}}`)
    );

    let template = compile(
      `{{component "-inner-component" (component "-looked-up" name=outerName age=outerAge)}}`
    );
    component = Component.extend({
      container,
      template,
      outerName: 'Outer',
      outerAge: 28
    }).create();

    runAppend(component);
    equal(component.$().text(), 'Inner 28', '-looked-up component rendered');
  });

  QUnit.test('conflicting positional and hash parameters raise and assertion if in the same closure', function() {
    let LookedUp = Component.extend();
    LookedUp.reopenClass({
      positionalParams: ['name']
    });
    registry.register(
      'component:-looked-up',
      LookedUp
    );
    registry.register(
      'template:components/-looked-up',
      compile(`{{greeting}} {{name}}`)
    );

    let template = compile(
      `{{component (component "-looked-up" "Hodari" name="Sergio") "Hodari" greeting="Hodi"}}`
    );
    component = Component.extend({ container, template }).create();

    expectAssertion(function() {
      runAppend(component);
    }, `You cannot specify both a positional param (at position 0) and the hash argument \`name\`.`);
  });

  QUnit.test('conflicting positional and hash parameters does not raise and assertion if in the different closure', function() {
    let LookedUp = Component.extend();
    LookedUp.reopenClass({
      positionalParams: ['name']
    });
    registry.register(
      'component:-looked-up',
      LookedUp
    );
    registry.register(
      'template:components/-looked-up',
      compile(`{{greeting}} {{name}}`)
    );

    let template = compile(
      `{{component (component "-looked-up" "Hodari") name="Sergio" greeting="Hodi"}}`
    );
    component = Component.extend({ container, template }).create();

    runAppend(component);
    equal(component.$().text(), 'Hodi Sergio', 'component is rendered');
  });

  QUnit.test('raises an assertion when component path is null', function() {
    let template = compile(`{{component (component lookupComponent)}}`);
    component = Component.extend({ container, template }).create();

    expectAssertion(() => {
      runAppend(component);
    });
  });

  QUnit.test('raises an assertion when component path is not a component name', function() {
    let template = compile(`{{component (component "not-a-component")}}`);
    component = Component.extend({ container, template }).create();

    expectAssertion(() => {
      runAppend(component);
    }, `The component helper cannot be used without a valid component name. You used "not-a-component" via (component "not-a-component")`);

    template = compile(`{{component (component compName)}}`);
    component = Component.extend({
      container,
      template,
      compName: 'not-a-component'
    }).create();

    expectAssertion(() => {
      runAppend(component);
    }, `The component helper cannot be used without a valid component name. You used "not-a-component" via (component compName)`);
  });

  QUnit.test('renders with dot path', function() {
    let expectedText = 'Hodi';
    registry.register(
      'template:components/-looked-up',
      compile(expectedText)
    );

    let template = compile('{{#with (hash lookedup=(component "-looked-up")) as |object|}}{{object.lookedup}}{{/with}}');
    component = Component.extend({ container, template }).create();

    runAppend(component);
    equal(component.$().text(), expectedText, '-looked-up component rendered');
  });

  QUnit.test('renders with dot path and attr', function() {
    let expectedText = 'Hodi';
    registry.register(
      'template:components/-looked-up',
      compile('{{expectedText}}')
    );

    let template = compile('{{#with (hash lookedup=(component "-looked-up")) as |object|}}{{object.lookedup expectedText=expectedText}}{{/with}}');
    component = Component.extend({ container, template }).create({
      expectedText
    });

    runAppend(component);
    equal(component.$().text(), expectedText, '-looked-up component rendered');
  });

  QUnit.test('renders with dot path curried over attr', function() {
    let expectedText = 'Hodi';
    registry.register(
      'template:components/-looked-up',
      compile('{{expectedText}}')
    );

    let template = compile('{{#with (hash lookedup=(component "-looked-up" expectedText=expectedText)) as |object|}}{{object.lookedup}}{{/with}}');
    component = Component.extend({ container, template }).create({
      expectedText
    });

    runAppend(component);
    equal(component.$().text(), expectedText, '-looked-up component rendered');
  });
}
